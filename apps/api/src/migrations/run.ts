/**
 * Run pending DB migrations.
 *
 * Usage (from repo root):
 *   npm run migrate -w @aeo-pcs/api
 *
 * Requires MONGODB_URI (and other env vars if a migration imports app services).
 */
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  // Load env after dotenv so required vars are present before app imports.
  await import("../config/env");
  const { connectMongo } = await import("../config/db");
  const { MigrationModel } = await import("../models/Migration");
  const m001 = await import("./001_seed_aeo_settings");

  type Migration = { name: string; up: () => Promise<void> };
  const migrations: Migration[] = [m001];

  await connectMongo();

  for (const migration of migrations) {
    const existing = await MigrationModel.findOne({ name: migration.name }).lean();
    if (existing) {
      console.log(`skip  ${migration.name} (already applied)`);
      continue;
    }

    console.log(`apply ${migration.name}`);
    await migration.up();
    await MigrationModel.create({ name: migration.name, appliedAt: new Date() });
    console.log(`done  ${migration.name}`);
  }

  console.log("Migrations complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
