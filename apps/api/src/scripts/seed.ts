/**
 * Seed an admin user + optional demo business user.
 * Usage (from repo root):
 *   SEED_ADMIN_EMAIL=admin@masteraeo.com SEED_ADMIN_PASSWORD='...' npm run seed -w @aeo-pcs/api
 * Optional:
 *   SEED_BUSINESS_EMAIL=demo@masteraeo.com SEED_BUSINESS_PASSWORD='...'
 */
import "../config/env";
import { connectMongo } from "../config/db";
import { BusinessModel } from "../models/Business";
import { UserModel } from "../models/User";
import { hashPassword } from "../utils/auth";

async function upsertUser(input: {
  email: string;
  password: string;
  role: "admin" | "business";
  withBusiness?: boolean;
}) {
  const email = input.email.toLowerCase().trim();
  const passwordHash = await hashPassword(input.password);
  let user = await UserModel.findOne({ email });
  if (user) {
    user.passwordHash = passwordHash;
    user.role = input.role;
    user.status = "active";
    await user.save();
    console.log(`Updated user ${email} (${input.role})`);
  } else {
    user = await UserModel.create({
      email,
      passwordHash,
      role: input.role,
      status: "active",
    });
    console.log(`Created user ${email} (${input.role})`);
  }

  if (input.withBusiness) {
    const existing = await BusinessModel.findOne({ ownerUserId: user._id });
    if (!existing) {
      await BusinessModel.create({
        ownerUserId: user._id,
        name: "Demo Business",
        category: "Other",
        city: "Ahmedabad",
        state: "Gujarat",
        country: "India",
        countryCode: "IN",
        stateCode: "GJ",
        description: "Seeded demo business — complete profile in onboarding.",
        targetItems: ["General services"],
        targetLocations: [
          { city: "Ahmedabad", state: "Gujarat", country: "India", countryCode: "IN", stateCode: "GJ" },
        ],
        nameAliases: [],
        websiteUrl: "",
        googleBusinessUrl: "",
        socialLinks: [],
        profileCompletedAt: null,
      });
      console.log(`Created business profile for ${email}`);
    }
  }
}

  async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required");
  }
  if (adminPassword.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  }

  await connectMongo();
  const { ensureAeoSettings } = await import("../services/aeoSettings.service");
  await ensureAeoSettings();
  await upsertUser({ email: adminEmail, password: adminPassword, role: "admin" });

  const bizEmail = process.env.SEED_BUSINESS_EMAIL?.trim();
  const bizPassword = process.env.SEED_BUSINESS_PASSWORD?.trim();
  if (bizEmail && bizPassword) {
    if (bizPassword.length < 8) {
      throw new Error("SEED_BUSINESS_PASSWORD must be at least 8 characters");
    }
    await upsertUser({
      email: bizEmail,
      password: bizPassword,
      role: "business",
      withBusiness: true,
    });
  }

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
