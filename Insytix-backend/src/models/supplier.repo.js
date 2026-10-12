"use strict";

const db = require("../db");
const { newId, now } = require("../lib/util");

function create(tenantId, data) {
  const id = newId();
  db.prepare(
    `INSERT INTO suppliers
      (id, tenant_id, name, method, status, ftp_protocol, ftp_host, ftp_port,
       ftp_username, ftp_password_enc, ftp_remote_path, column_map, created_at)
     VALUES (@id, @tenant_id, @name, @method, 'active', @ftp_protocol, @ftp_host, @ftp_port,
       @ftp_username, @ftp_password_enc, @ftp_remote_path, @column_map, @created_at)`
  ).run({
    id,
    tenant_id: tenantId,
    name: data.name,
    method: data.method,
    ftp_protocol: data.ftp_protocol || null,
    ftp_host: data.ftp_host || null,
    ftp_port: data.ftp_port || null,
    ftp_username: data.ftp_username || null,
    ftp_password_enc: data.ftp_password_enc || null,
    ftp_remote_path: data.ftp_remote_path || null,
    column_map: data.column_map ? JSON.stringify(data.column_map) : null,
    created_at: now(),
  });
  return findById(tenantId, id);
}

function findById(tenantId, id) {
  return db.prepare(`SELECT * FROM suppliers WHERE tenant_id = ? AND id = ?`).get(tenantId, id);
}

function list(tenantId) {
  return db
    .prepare(`SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY created_at DESC`)
    .all(tenantId);
}

/** List suppliers with a live product count for the suppliers page / dashboard. */
function listWithCounts(tenantId) {
  return db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count
         FROM suppliers s
        WHERE s.tenant_id = ?
        ORDER BY s.created_at DESC`
    )
    .all(tenantId);
}

function remove(tenantId, id) {
  // Remove the supplier and all of its catalog in one transaction.
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE tenant_id = ? AND supplier_id = ?)`).run(tenantId, id);
    db.prepare(`DELETE FROM bundle_components WHERE product_id IN (SELECT id FROM products WHERE tenant_id = ? AND supplier_id = ?)`).run(tenantId, id);
    db.prepare(`DELETE FROM variants WHERE tenant_id = ? AND supplier_id = ?`).run(tenantId, id);
    db.prepare(`DELETE FROM products WHERE tenant_id = ? AND supplier_id = ?`).run(tenantId, id);
    db.prepare(`DELETE FROM ingestion_runs WHERE tenant_id = ? AND supplier_id = ?`).run(tenantId, id);
    db.prepare(`DELETE FROM suppliers WHERE tenant_id = ? AND id = ?`).run(tenantId, id);
  });
  tx();
}

function setStatus(tenantId, id, status) {
  db.prepare(`UPDATE suppliers SET status = ? WHERE tenant_id = ? AND id = ?`).run(status, tenantId, id);
  return findById(tenantId, id);
}

function markIngested(id) {
  db.prepare(`UPDATE suppliers SET last_ingest_at = ? WHERE id = ?`).run(now(), id);
}

module.exports = { create, findById, list, listWithCounts, remove, setStatus, markIngested };
