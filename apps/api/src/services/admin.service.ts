import { BusinessModel } from "../models/Business";
import { UserModel } from "../models/User";
import { AppError } from "../utils/AppError";
import { hashPassword } from "../utils/auth";
import { toAuthUser } from "../utils/serialize";

export async function listUsers() {
  const users = await UserModel.find({ role: "business" }).sort({ createdAt: -1 }).lean();
  const businesses = await BusinessModel.find().lean();
  const byOwner = new Map(businesses.map((b) => [String(b.ownerUserId), b]));

  return users.map((u) => {
    const biz = byOwner.get(String(u._id));
    return {
      id: String(u._id),
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      business: biz
        ? {
            id: String(biz._id),
            name: biz.name || "",
            profileCompletedAt: biz.profileCompletedAt
              ? new Date(biz.profileCompletedAt).toISOString()
              : null,
          }
        : null,
    };
  });
}

export async function listBusinesses() {
  const businesses = await BusinessModel.find().sort({ createdAt: -1 }).lean();
  const owners = await UserModel.find({
    _id: { $in: businesses.map((b) => b.ownerUserId) },
  }).lean();
  const emailById = new Map(owners.map((o) => [String(o._id), o.email]));

  return businesses.map((b) => ({
    id: String(b._id),
    name: b.name || "",
    category: b.category || "",
    city: b.city || "",
    country: b.country || "",
    websiteUrl: b.websiteUrl || "",
    profileCompletedAt: b.profileCompletedAt
      ? new Date(b.profileCompletedAt).toISOString()
      : null,
    ownerEmail: emailById.get(String(b.ownerUserId)) || null,
    createdAt: b.createdAt,
  }));
}

export async function createBusinessUser(input: {
  email: string;
  password: string;
  businessName?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await UserModel.create({
    email,
    passwordHash,
    role: "business",
    status: "active",
  });
  const business = await BusinessModel.create({
    ownerUserId: user._id,
    name: input.businessName || "",
    category: "",
    city: "",
    country: "",
    description: "",
    websiteUrl: "",
    googleBusinessUrl: "",
    socialLinks: [],
    profileCompletedAt: null,
  });

  try {
    const { ensureDefaultPlans } = await import("./productPlans.service");
    const { assignDefaultStarterPlan } = await import("./subscriptions.service");
    await ensureDefaultPlans();
    await assignDefaultStarterPlan(String(business._id));
  } catch {
    // non-fatal if plans not seeded yet
  }

  return { user: toAuthUser(user, business) };
}

export async function setUserStatus(input: {
  actorUserId: string;
  targetUserId: string;
  status: "active" | "disabled";
}) {
  if (input.targetUserId === input.actorUserId) {
    throw new AppError("Cannot change your own status", 400);
  }
  const user = await UserModel.findById(input.targetUserId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.role === "admin") {
    throw new AppError("Cannot disable admin accounts here", 400);
  }
  user.status = input.status;
  await user.save();
  return { ok: true as const };
}
