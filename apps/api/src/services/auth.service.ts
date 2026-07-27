import { env } from "../config/env";
import { BusinessModel } from "../models/Business";
import { UserModel } from "../models/User";
import { AppError } from "../utils/AppError";
import { hashPassword, signAccessToken, verifyPassword } from "../utils/auth";
import { toAuthUser } from "../utils/serialize";

export async function loginUser(emailRaw: string, password: string) {
  const email = emailRaw.toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user || user.status !== "active") {
    throw new AppError("Invalid email or password", 401);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError("Invalid email or password", 401);
  }

  const business = await BusinessModel.findOne({ ownerUserId: user._id });
  const token = signAccessToken({
    sub: String(user._id),
    role: user.role as "admin" | "business",
  });
  return { token, user: toAuthUser(user, business) };
}

export async function signupUser(emailRaw: string, password: string) {
  if (!env.signupEnabled) {
    throw new AppError("Signup is disabled. Contact masteraeo.com for an invite.", 403);
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
