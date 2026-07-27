import { Router } from "express";
import { body } from "express-validator";
import { env } from "../config/env";
import { asyncHandler, validate } from "../middleware/validate";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { BusinessModel } from "../models/Business";
import { UserModel } from "../models/User";
import { hashPassword, signAccessToken, verifyPassword } from "../utils/auth";
import { toAuthUser } from "../utils/serialize";

export const authRouter = Router();

authRouter.post(
  "/login",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8, max: 128 }),
  ]),
  asyncHandler(async (req, res) => {
    const email = String(req.body.email).toLowerCase();
    const user = await UserModel.findOne({ email });
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await verifyPassword(req.body.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const business = await BusinessModel.findOne({ ownerUserId: user._id });
    const token = signAccessToken({ sub: String(user._id), role: user.role as "admin" | "business" });
    res.json({ token, user: toAuthUser(user, business) });
  })
);

authRouter.post(
  "/signup",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8, max: 128 }),
  ]),
  asyncHandler(async (req, res) => {
    if (!env.signupEnabled) {
      return res.status(403).json({
        error: "Signup is disabled. Contact info@masteraeo.com for an invite.",
      });
    }

    const email = String(req.body.email).toLowerCase();
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(req.body.password);
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
    res.status(201).json({ token, user: toAuthUser(user, business) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await UserModel.findById(req.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    const business = await BusinessModel.findOne({ ownerUserId: user._id });
    res.json({ user: toAuthUser(user, business) });
  })
);
