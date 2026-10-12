"use strict";

const { createClient, shopifyErrorMessage } = require("./client");
const { decrypt } = require("../../lib/crypto");
const { ApiError } = require("../../lib/http");
const productRepo = require("../../models/product.repo");
const tenantRepo = require("../../models/tenant.repo");
const config = require("../../config/env");

/** Resolve a tenant's live Shopify connection, or null if not connected. */
function getConnection(tenant) {
  const token = decrypt(tenant.shopify_token_enc);
  if (!tenant.shopify_domain || !token) return null;
  return { shop: tenant.shopify_domain, token, apiVersion: tenant.shopify_api_version || config.shopifyApiVersion };
}

function priceString(v) {
  return v !== null && v !== undefined && Number(v) > 0 ? Number(v).toFixed(2) : "0.00";
}

/** Derive the option-name array (max 3) consistent across all variants. */
function deriveOptionNames(variants) {
  const names = [];
  for (let i = 1; i <= 3; i++) {
    const name = variants.map((v) => v[`option${i}_name`]).find(Boolean);
    if (name) names.push(name);
  }
  return names;
}

/** Build the Shopify product payload (REST shape) from an Insytix product graph. */
function buildProductPayload(product, status) {
  const optionNames = deriveOptionNames(product.variants);

  const variants = product.variants.map((v) => {
    const row = {
      sku: v.sku,
      price: priceString(v.price),
      inventory_management: "shopify",
      inventory_policy: "deny",
      requires_shipping: true,
      fulfillment_service: "manual",
    };
    if (v.compare_at_price && v.price && v.compare_at_price > v.price) {
      row.compare_at_price = Number(v.compare_at_price).toFixed(2);
    }
    if (v.barcode) row.barcode = v.barcode;
    // Assign option values when the product has named options.
    optionNames.forEach((_, idx) => {
      row[`option${idx + 1}`] = v[`option${idx + 1}_value`] || "Default";
    });
    return row;
  });

  const payload = {
    title: product.title || product.variants[0]?.sku || "Untitled product",
    body_html: product.description || "",
    vendor: product.vendor || product.supplier_name || "",
    product_type: product.category || "", // supplier's own category, verbatim
    status, // 'active' | 'draft'
    variants,
  };
  if (optionNames.length) payload.options = optionNames.map((name) => ({ name }));

  // Only http(s) images can be fetched by Shopify.
  const imageSrcs = product.images.map((i) => i.src).filter((s) => /^https?:\/\//i.test(s));
  if (imageSrcs.length) payload.images = imageSrcs.map((src) => ({ src }));

  return payload;
}

async function resolveLocationId(client, tenant) {
  if (tenant.shopify_location_id) return tenant.shopify_location_id;
  const locations = await client.locations();
  const active = locations.find((l) => l.active) || locations[0];
  if (active) {
    tenantRepo.setLocation(tenant.id, String(active.id));
    return String(active.id);
  }
  return null;
}

/**
 * Sync one product (with all its variants & images) to Shopify via the REST Admin API.
 * Creates or updates the product, replaces images, and sets per-variant inventory.
 */
async function syncProductToShopify(tenant, productId) {
  const product = productRepo.getForSync(tenant.id, productId);
  if (!product) throw new ApiError(404, "Product not found.");

  const conn = getConnection(tenant);
  if (!conn) throw new ApiError(400, "Connect your Shopify store in Settings → Store first.");

  if (!product.variants.length) throw new ApiError(422, "Product has no variants to sync.");

  // Eligible products publish as active; otherwise they go up as draft (with the reason recorded).
  const status = product.eligible ? "active" : "draft";
  const client = createClient(conn);
  const payload = buildProductPayload(product, status);

  let shopifyProduct;
  try {
    if (product.shopify_product_id) {
      // Merge existing Shopify variant ids by sku so we update rather than duplicate.
      let existing = null;
      try { existing = await client.getProduct(product.shopify_product_id); } catch { existing = null; }
      if (existing) {
        const idBySku = {};
        (existing.variants || []).forEach((v) => { idBySku[v.sku] = v.id; });
        payload.variants = payload.variants.map((v) => (idBySku[v.sku] ? { ...v, id: idBySku[v.sku] } : v));
        shopifyProduct = await client.updateProduct(product.shopify_product_id, payload);
        await replaceImages(client, shopifyProduct.id, payload.images || []);
      } else {
        shopifyProduct = await client.createProduct(payload);
      }
    } else {
      shopifyProduct = await client.createProduct(payload);
    }
  } catch (err) {
    const message = shopifyErrorMessage(err);
    productRepo.updateSyncResult(product.id, { syncStatus: "error", syncError: message });
    throw new ApiError(422, `Shopify sync failed: ${message}`);
  }

  // Write back Shopify ids (match returned variants to ours by sku).
  const variantBySku = {};
  (shopifyProduct.variants || []).forEach((v) => { variantBySku[v.sku] = v; });
  for (const v of product.variants) {
    const sv = variantBySku[v.sku];
    if (sv) productRepo.updateVariantShopify(v.id, { shopifyVariantId: String(sv.id), shopifyInventoryItemId: String(sv.inventory_item_id) });
  }

  // Push inventory per variant at the primary location (best-effort — never fails the sync).
  let inventoryWarning = null;
  try {
    const locationId = await resolveLocationId(client, tenant);
    if (locationId) {
      for (const v of product.variants) {
        const sv = variantBySku[v.sku];
        if (sv?.inventory_item_id) {
          await client.setInventory({ locationId, inventoryItemId: sv.inventory_item_id, available: v.quantity });
        }
      }
    }
  } catch (err) {
    inventoryWarning = shopifyErrorMessage(err);
  }

  productRepo.updateSyncResult(product.id, {
    shopifyProductId: String(shopifyProduct.id),
    shopifyStatus: status,
    syncStatus: "synced",
    syncError: null,
  });

  return {
    shopifyProductId: String(shopifyProduct.id),
    status,
    variantsSynced: (shopifyProduct.variants || []).length,
    imagesSynced: (payload.images || []).length,
    inventoryWarning,
  };
}

async function replaceImages(client, productId, images) {
  const existing = await client.listImages(productId).catch(() => []);
  for (const img of existing) await client.deleteImage(productId, img.id).catch(() => {});
  for (const img of images) await client.addImage(productId, img.src).catch(() => {});
}

module.exports = { syncProductToShopify, getConnection };
