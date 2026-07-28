import type { UserRole } from "@aeo-pcs/shared";
import { env } from "../config/env";
import { BusinessModel } from "../models/Business";
import { UserModel } from "../models/User";
import { AppError } from "../utils/AppError";
import { hashPassword, signAccessToken, verifyPassword } from "../utils/auth";
import { toAuthUser } from "../utils/serialize";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function expectedRoleForOrigin(originRaw: string | undefined): UserRole {
  const origin = originRaw ? normalizeOrigin(originRaw) : "";
  if (!origin) {
    throw new AppError("Missing request origin", 403);
  }
  if (origin === env.adminSiteUrl) return "admin";
  if (origin === env.publicSiteUrl) return "business";
  throw new AppError("Unknown login origin", 403);
}

export async function loginUser(
  emailRaw: string,
  password: string,
  expectedRole: UserRole
) {
  const email = emailRaw.toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user || user.status !== "active") {
    throw new AppError("Invalid email or password", 401);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError("Invalid email or password", 401);
  }
  if (user.role !== expectedRole) {
    throw new AppError(
      expectedRole === "admin"
        ? "Admin access only. Use the business app to log in as a business user."
        : "Business access only. Use the admin portal to log in as an admin.",
      403
    );
  }

  const business = await BusinessModel.findOne({ ownerUserId: user._id });
  const token = signAccessToken({
    sub: String(user._id),
    role: user.role as UserRole,
  });
  return { token, user: toAuthUser(user, business) };
}

export async function signupUser(emailRaw: string, password: string) {
  if (!env.signupEnabled) {
    throw new AppError("Signup is disabled. Contact Master AEO for an invite.", 403);
  }

  const email = emailRaw.toLowerCase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    email,
    passwordHash,
    role: "business",
    status: "active",
  });
  const business = await BusinessModel.create({
    ownerUserId: user._id,
    name: "",
    category: "",
    city: "",
    country: "",
    description: "",
    websiteUrl: "",
    googleBusinessUrl: "",
    socialLinks: [],
    profileCompletedAt: null,
  });

  const token = signAccessToken({ sub: String(user._id), role: "business" });
  return { token, user: toAuthUser(user, business) };
}

export async function getMe(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError("User not found", 401);
  }
  const business = await BusinessModel.findOne({ ownerUserId: user._id });
  return { user: toAuthUser(user, business) };
}
