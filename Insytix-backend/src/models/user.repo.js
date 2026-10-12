"use strict";

const db = require("../db");
const { newId, now } = require("../lib/util");

function create({ tenantId, name, email, passwordHash, role = "owner" }) {
  const id = newId();
  db.prepare(
    `INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(id, tenantId, name, email.toLowerCase(), passwordHash, role, now());
  return findById(id);
}

function findByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(String(email).toLowerCase());
}

function findById(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

module.exports = { create, findByEmail, findById };
