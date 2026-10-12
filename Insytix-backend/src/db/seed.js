"use strict";

/**
 * Seed a ready-to-demo workspace:
 *   - a tenant + owner login
 *   - a CSV supplier with the bundled sample feed already imported
 *
 * Idempotent: safe to run multiple times (it re-uses the demo account and re-imports).
 *
 *   npm run seed
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("./index");
const tenantRepo = require("../models/tenant.repo");
const userRepo = require("../models/user.repo");
const supplierRepo = require("../models/supplier.repo");
const { ingestUpload } = require("../services/ingestion/ingest");
const config = require("../config/env");

const DEMO = {
  storeName: "Insytix Demo Store",
  name: "Demo Owner",
  email: "demo@insytix.app",
  password: "demo12345",
  supplierName: "Aspen Wholesale (Sample)",
};

function run() {
  // Tenant + user (reuse if the email already exists).
  let user = userRepo.findByEmail(DEMO.email);
  let tenant;
  if (user) {
    tenant = tenantRepo.findById(user.tenant_id);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(bcrypt.hashSync(DEMO.password, 10), user.id);
  } else {
    tenant = tenantRepo.create({ storeName: DEMO.storeName });
    user = userRepo.create({
      tenantId: tenant.id,
      name: DEMO.name,
      email: DEMO.email,
      passwordHash: bcrypt.hashSync(DEMO.password, 10),
      role: "owner",
    });
  }

  // CSV supplier (reuse if present).
  let supplier = supplierRepo.list(tenant.id).find((s) => s.name === DEMO.supplierName);
  if (!supplier) supplier = supplierRepo.create(tenant.id, { name: DEMO.supplierName, method: "csv" });

  // Import the bundled sample feed.
  const buffer = fs.readFileSync(path.join(config.sampleDataDir, "furniture-feed.csv"));
  const result = ingestUpload({ tenant, supplier, buffer, filename: "furniture-feed.csv" });

  console.log("\n  ✓ Seed complete");
  console.log("  ------------------------------------------");
  console.log(`  Login email:    ${DEMO.email}`);
  console.log(`  Login password: ${DEMO.password}`);
  console.log(`  Supplier:       ${supplier.name} (CSV)`);
  console.log(`  Imported:       ${result.summary.products} products, ${result.summary.bundles} bundles, ${result.summary.variants} variants`);
  console.log("  ------------------------------------------\n");
}

try {
  run();
  process.exit(0);
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exit(1);
}
