import type { UserRole } from "@aeo-pcs/shared";
import { COPY } from "@aeo-pcs/shared";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import { BusinessModel } from "../models/Business";
import { UserModel } from "../models/User";
import { AppError } from "../utils/AppError";
import {
  createSessionId,
  hashPassword,
  signAccessToken,
  verifyPassword,
} from "../utils/auth";
import { toAuthUser } from "../utils/serialize";
import { findActiveVisibilityJobForBusiness } from "./visibilityJobs.service";

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

async function issueSession(
  user: { _id: unknown; role: string; sessionId?: string | null; save: () => Promise<unknown> },
  business: unknown
) {
  const sessionId = createSessionId();
  user.sessionId = sessionId;
  await user.save();
  const token = signAccessToken({
    sub: String(user._id),
    role: user.role as UserRole,
    sid: sessionId,
  });
  return { token, user: toAuthUser(user as never, business as never) };
}

export async function loginUser(
  emailRaw: string,
  password: string,
  expectedRole: UserRole,
  options?: { revokeOtherSession?: boolean }
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

  if (user.sessionId && !options?.revokeOtherSession) {
    let visibilityRunInProgress = false;
    let activeJobId: string | undefined;
    if (business) {
      const active = await findActiveVisibilityJobForBusiness(String(business._id));
      if (active) {
        visibilityRunInProgress = true;
        activeJobId = String(active._id);
      }
    }
    throw new AppError(
      COPY.auth.sessionActive,
      409,
      "SESSION_ACTIVE",
      { visibilityRunInProgress, activeJobId }
    );
  }

  return issueSession(user, business);
}

export async function signupUser(emailRaw: string, password: string) {
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
    sessionId: randomUUID(),
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

  const token = signAccessToken({
    sub: String(user._id),
    role: "business",
    sid: String(user.sessionId),
  });
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

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError("User not found", 401);
  }
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError("Current password is incorrect", 400);
  }
  if (currentPassword === newPassword) {
    throw new AppError("New password must be different from the current password", 400);
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}

export async function logoutUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError("User not found", 401);
  }
  user.sessionId = null;
  await user.save();
  return { ok: true as const };
}
