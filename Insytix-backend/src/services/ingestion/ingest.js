"use strict";

const { parseFeed } = require("./parseFeed");
const { normalizeRows } = require("./normalize");
const { fetchFeedBuffer } = require("./ftpClient");
const productRepo = require("../../models/product.repo");
const supplierRepo = require("../../models/supplier.repo");
const ingestionRunRepo = require("../../models/ingestionRun.repo");
const { decrypt } = require("../../lib/crypto");

/**
 * Core ingestion: parse a feed buffer, normalise it, upsert the catalog, log a run.
 * Shared by both the CSV upload and FTP fetch paths (they only differ in how the
 * buffer is obtained — exactly like the production pipeline's single normaliser).
 */
function ingestBuffer({ tenant, supplier, buffer, source }) {
  const overrides = supplier.column_map ? safeParse(supplier.column_map) : {};
  const rows = parseFeed(buffer);
  if (!rows.length) {
    const run = ingestionRunRepo.record(tenant.id, supplier.id, {
      method: supplier.method, source, status: "failed", message: "No data rows found in the feed file.",
    });
    return { run, error: "No data rows found in the feed file." };
  }

  const { products, stats } = normalizeRows(rows, overrides);

  let created = 0;
  let updated = 0;
  for (const p of products) {
    const res = productRepo.upsertProductGraph(tenant.id, supplier.id, p);
    if (res.created) created += 1; else updated += 1;
  }

  supplierRepo.markIngested(supplier.id);

  const run = ingestionRunRepo.record(tenant.id, supplier.id, {
    method: supplier.method,
    source,
    status: "success",
    total_rows: stats.rows,
    products_created: created,
    products_updated: updated,
    variants_count: stats.variants,
    images_count: stats.images,
    bundles_count: stats.bundles,
    message: `Imported ${products.length} products (${created} new, ${updated} updated) from ${stats.rows} rows.`,
  });

  return {
    run,
    summary: {
      rows: stats.rows,
      products: products.length,
      created,
      updated,
      variants: stats.variants,
      images: stats.images,
      bundles: stats.bundles,
    },
  };
}

/** CSV/feed file upload path. */
function ingestUpload({ tenant, supplier, buffer, filename }) {
  return ingestBuffer({ tenant, supplier, buffer, source: filename || "upload.csv" });
}

/** FTP/SFTP fetch path — download the file then run the same pipeline. */
async function ingestFromFtp({ tenant, supplier }) {
  const cfg = {
    protocol: supplier.ftp_protocol || "ftp",
    host: supplier.ftp_host,
    port: supplier.ftp_port,
    username: supplier.ftp_username,
    password: decrypt(supplier.ftp_password_enc),
    remotePath: supplier.ftp_remote_path,
  };
  const buffer = await fetchFeedBuffer(cfg);
  return ingestBuffer({ tenant, supplier, buffer, source: `${cfg.protocol}://${cfg.host}${cfg.remotePath}` });
}

function safeParse(str) {
  try { return JSON.parse(str); } catch { return {}; }
}

module.exports = { ingestUpload, ingestFromFtp, ingestBuffer };
