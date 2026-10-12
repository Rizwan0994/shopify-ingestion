"use strict";

const db = require("../db");
const { newId, now } = require("../lib/util");

function record(tenantId, supplierId, data) {
  const id = newId();
  db.prepare(
    `INSERT INTO ingestion_runs
       (id, tenant_id, supplier_id, method, source, status, total_rows,
        products_created, products_updated, variants_count, images_count, bundles_count, message, created_at)
     VALUES (@id, @tenant_id, @supplier_id, @method, @source, @status, @total_rows,
        @products_created, @products_updated, @variants_count, @images_count, @bundles_count, @message, @created_at)`
  ).run({
    id,
    tenant_id: tenantId,
    supplier_id: supplierId,
    method: data.method || null,
    source: data.source || null,
    status: data.status,
    total_rows: data.total_rows || 0,
    products_created: data.products_created || 0,
    products_updated: data.products_updated || 0,
    variants_count: data.variants_count || 0,
    images_count: data.images_count || 0,
    bundles_count: data.bundles_count || 0,
    message: data.message || null,
    created_at: now(),
  });
  return db.prepare(`SELECT * FROM ingestion_runs WHERE id = ?`).get(id);
}

function listForSupplier(tenantId, supplierId, limit = 10) {
  return db
    .prepare(
      `SELECT * FROM ingestion_runs WHERE tenant_id = ? AND supplier_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(tenantId, supplierId, limit);
}

function listRecent(tenantId, limit = 10) {
  return db
    .prepare(
      `SELECT r.*, s.name AS supplier_name
         FROM ingestion_runs r JOIN suppliers s ON s.id = r.supplier_id
        WHERE r.tenant_id = ? ORDER BY r.created_at DESC LIMIT ?`
    )
    .all(tenantId, limit);
}

module.exports = { record, listForSupplier, listRecent };
