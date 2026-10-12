"use strict";

const db = require("../db");
const { newId, now } = require("../lib/util");
const config = require("../config/env");

function create({ storeName }) {
  const id = newId();
  db.prepare(
    `INSERT INTO tenants (id, store_name, shopify_api_version, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, storeName, config.shopifyApiVersion, now());
  return findById(id);
}

function findById(id) {
  return db.prepare(`SELECT * FROM tenants WHERE id = ?`).get(id);
}

function updateShopifyConnection(id, { domain, tokenEnc, apiVersion }) {
  db.prepare(
    `UPDATE tenants
        SET shopify_domain = ?, shopify_token_enc = ?, shopify_api_version = ?, shopify_location_id = NULL
      WHERE id = ?`
  ).run(domain, tokenEnc, apiVersion || config.shopifyApiVersion, id);
  return findById(id);
}

function setLocation(id, locationId) {
  db.prepare(`UPDATE tenants SET shopify_location_id = ? WHERE id = ?`).run(locationId, id);
}

function disconnectShopify(id, { clearDomain }) {
  if (clearDomain) {
    db.prepare(
      `UPDATE tenants SET shopify_token_enc = NULL, shopify_domain = NULL, shopify_location_id = NULL WHERE id = ?`
    ).run(id);
  } else {
    db.prepare(
      `UPDATE tenants SET shopify_token_enc = NULL, shopify_location_id = NULL WHERE id = ?`
    ).run(id);
  }
  return findById(id);
}

module.exports = { create, findById, updateShopifyConnection, setLocation, disconnectShopify };
