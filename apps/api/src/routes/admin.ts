import { Router } from "express";
import { body, param } from "express-validator";
import { asyncHandler, validate } from "../middleware/validate";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import { BusinessModel } from "../models/Business";
import { UserModel } from "../models/User";
import { hashPassword } from "../utils/auth";
import { toAuthUser } from "../utils/serialize";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();
    const businesses = await BusinessModel.find().lean();
    const byOwner = new Map(businesses.map((b) => [String(b.ownerUserId), b]));

    res.json({
      users: users.map((u) => {
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
      }),
    });
  })
);

adminRouter.get(
  "/businesses",
  asyncHandler(async (_req, res) => {
    const businesses = await BusinessModel.find().sort({ createdAt: -1 }).lean();
    const owners = await UserModel.find({
      _id: { $in: businesses.map((b) => b.ownerUserId) },
    }).lean();
    const emailById = new Map(owners.map((o) => [String(o._id), o.email]));

    res.json({
      businesses: businesses.map((b) => ({
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
      })),
    });
  })
);

adminRouter.post(
  "/users",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8, max: 128 }),
    body("businessName").optional().isString().trim().isLength({ max: 200 }),
  ]),
  asyncHandler(async (req, res) => {
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
      name: req.body.businessName || "",
      category: "",
      city: "",
      country: "",
      description: "",
      websiteUrl: "",
      googleBusinessUrl: "",
      socialLinks: [],
      profileCompletedAt: null,
    });

    res.status(201).json({ user: toAuthUser(user, business) });
  })
);

adminRouter.patch(
  "/users/:userId/status",
  validate([
    param("userId").isMongoId(),
    body("status").isIn(["active", "disabled"]),
  ]),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: "Cannot change your own status" });
    }
    const user = await UserModel.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") {
      return res.status(400).json({ error: "Cannot disable admin accounts here" });
    }
    user.status = req.body.status;
    await user.save();
    res.json({ ok: true });
  })
);
