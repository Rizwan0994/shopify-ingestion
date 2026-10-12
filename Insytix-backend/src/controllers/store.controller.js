"use strict";

const { ApiError, asyncHandler, ok } = require("../lib/http");
const { presentTenant } = require("../lib/present");
const { encrypt, decrypt } = require("../lib/crypto");
const { createClient, shopifyErrorMessage } = require("../services/shopify/client");
const tenantRepo = require("../models/tenant.repo");
const config = require("../config/env");

function normalizeDomain(input) {
  let d = String(input || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  if (d && !d.includes(".")) d = `${d}.myshopify.com`;
  return d;
}

// GET /api/store  → current Shopify connection state (never returns the token)
const get = asyncHandler(async (req, res) => {
  const t = req.tenant;
  return ok(res, {
    ...presentTenant(t),
    apiVersion: t.shopify_api_version || config.shopifyApiVersion,
    locationId: t.shopify_location_id || null,
  });
});

// PUT /api/store  { shopifyDomain, accessToken, apiVersion? }  → save connection
const save = asyncHandler(async (req, res) => {
  const domain = normalizeDomain(req.body.shopifyDomain);
  const accessToken = String(req.body.accessToken || "").trim();
  const apiVersion = String(req.body.apiVersion || "").trim() || config.shopifyApiVersion;

  if (!domain) throw new ApiError(400, "Shopify store domain is required (e.g. my-store.myshopify.com).");
  if (!accessToken) throw new ApiError(400, "Shopify Admin API access token is required.");

  const tenant = tenantRepo.updateShopifyConnection(req.tenantId, {
    domain,
    tokenEnc: encrypt(accessToken),
    apiVersion,
  });
  return ok(res, { ...presentTenant(tenant), apiVersion });
});

// POST /api/store/test  → verify the stored (or provided) credentials against Shopify
const test = asyncHandler(async (req, res) => {
  const domain = req.body.shopifyDomain ? normalizeDomain(req.body.shopifyDomain) : req.tenant.shopify_domain;
  const token = req.body.accessToken ? String(req.body.accessToken).trim() : decrypt(req.tenant.shopify_token_enc);
  const apiVersion = String(req.body.apiVersion || req.tenant.shopify_api_version || config.shopifyApiVersion);

  if (!domain || !token) throw new ApiError(400, "Enter a store domain and access token first.");

  try {
    const client = createClient({ shop: domain, token, apiVersion });
    const shop = await client.shopInfo();
    return ok(res, { ok: true, shopName: shop.name, shopDomain: shop.myshopifyDomain, email: shop.email });
  } catch (err) {
    throw new ApiError(422, `Could not connect to Shopify: ${shopifyErrorMessage(err)}`);
  }
});

// DELETE /api/store  { clearDomain? }  → disconnect
const disconnect = asyncHandler(async (req, res) => {
  const tenant = tenantRepo.disconnectShopify(req.tenantId, { clearDomain: !!req.body.clearDomain });
  return ok(res, presentTenant(tenant));
});

module.exports = { get, save, test, disconnect };
