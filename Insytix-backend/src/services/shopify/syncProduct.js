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

const numericId = (gid) => String(gid || "").split("/").pop();
const productGid = (id) => `gid://shopify/Product/${numericId(id)}`;
const priceString = (v) => (v !== null && v !== undefined && Number(v) > 0 ? Number(v).toFixed(2) : "0.00");

/** Option names (max 3) consistent across all variants. */
function deriveOptionNames(variants) {
  const names = [];
  for (let i = 1; i <= 3; i++) {
    const name = variants.map((v) => v[`option${i}_name`]).find(Boolean);
    if (name) names.push(name);
  }
  return names;
}

/** Build the ProductSetInput for the GraphQL productSet mutation. */
function buildProductSetInput(product, status, { includeId, includeFiles }) {
  const optionNames = deriveOptionNames(product.variants);
  const hasOptions = optionNames.length > 0;

  // Declarative options: real option axes, or a single default "Title" option.
  const productOptions = hasOptions
    ? optionNames.map((name, i) => {
        const values = [...new Set(product.variants.map((v) => v[`option${i + 1}_value`] || "Default"))];
        return { name, position: i + 1, values: values.map((name) => ({ name })) };
      })
    : [{ name: "Title", position: 1, values: [{ name: "Default Title" }] }];

  const variants = product.variants.map((v) => {
    const optionValues = hasOptions
      ? optionNames.map((name, i) => ({ optionName: name, name: v[`option${i + 1}_value`] || "Default" }))
      : [{ optionName: "Title", name: "Default Title" }];
    const row = {
      sku: v.sku,
      price: priceString(v.price),
      optionValues,
      inventoryItem: { tracked: true },
      inventoryPolicy: "DENY",
    };
    if (v.compare_at_price && v.price && v.compare_at_price > v.price) {
      row.compareAtPrice = Number(v.compare_at_price).toFixed(2);
    }
    if (v.barcode) row.barcode = v.barcode;
    return row;
  });

  const input = {
    title: product.title || product.variants[0]?.sku || "Untitled product",
    descriptionHtml: product.description || "",
    vendor: product.vendor || product.supplier_name || "",
    productType: product.category || "", // supplier's own category, verbatim
    status, // ACTIVE | DRAFT
    productOptions,
    variants,
  };
  if (includeId) input.id = productGid(product.shopify_product_id);
  if (includeFiles) {
    const files = product.images
      .map((i) => i.src)
      .filter((s) => /^https?:\/\//i.test(s))
      .map((src) => ({ originalSource: src, contentType: "IMAGE" }));
    if (files.length) input.files = files;
  }
  return input;
}

const PRODUCT_SET_MUTATION = `
  mutation productSet($input: ProductSetInput!, $synchronous: Boolean!) {
    productSet(input: $input, synchronous: $synchronous) {
      product {
        id
        status
        variants(first: 100) { nodes { id sku inventoryItem { id } } }
      }
      userErrors { field message }
    }
  }`;

const INVENTORY_SET_MUTATION = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      userErrors { field message }
    }
  }`;

/**
 * Sync one product (with variants & images) to Shopify via the GraphQL Admin API.
 * Uses productSet (declarative create/update) then inventorySetQuantities for stock.
 */
async function syncProductToShopify(tenant, productId) {
  const product = productRepo.getForSync(tenant.id, productId);
  if (!product) throw new ApiError(404, "Product not found.");

  const conn = getConnection(tenant);
  if (!conn) throw new ApiError(400, "Connect your Shopify store in Settings → Store first.");
  if (!product.variants.length) throw new ApiError(422, "Product has no variants to sync.");

  // Eligible products publish as ACTIVE; otherwise they go up as DRAFT.
  const status = product.eligible ? "ACTIVE" : "DRAFT";
  const isUpdate = !!product.shopify_product_id;
  const client = createClient(conn);

  const input = buildProductSetInput(product, status, { includeId: isUpdate, includeFiles: !isUpdate });

  let result;
  try {
    const data = await client.graphql(PRODUCT_SET_MUTATION, { input, synchronous: true });
    const errors = data.productSet?.userErrors || [];
    if (errors.length) throw new Error(errors.map((e) => `${(e.field || []).join(".")} ${e.message}`.trim()).join("; "));
    result = data.productSet.product;
  } catch (err) {
    const message = shopifyErrorMessage(err);
    productRepo.updateSyncResult(product.id, { syncStatus: "error", syncError: message });
    throw new ApiError(422, `Shopify sync failed: ${message}`);
  }

  // Write back Shopify ids (match returned variants to ours by sku).
  const returned = result.variants?.nodes || [];
  const bySku = {};
  returned.forEach((v) => { bySku[v.sku] = v; });
  for (const v of product.variants) {
    const sv = bySku[v.sku];
    if (sv) {
      productRepo.updateVariantShopify(v.id, {
        shopifyVariantId: numericId(sv.id),
        shopifyInventoryItemId: sv.inventoryItem ? numericId(sv.inventoryItem.id) : null,
      });
    }
  }

  // Set inventory per variant at the primary location (best-effort — never fails the sync).
  let inventoryWarning = null;
  try {
    let locationId = tenant.shopify_location_id;
    if (!locationId) {
      locationId = await client.primaryLocationId();
      if (locationId) tenantRepo.setLocation(tenant.id, locationId);
    }
    const quantities = [];
    for (const v of product.variants) {
      const sv = bySku[v.sku];
      if (locationId && sv?.inventoryItem?.id) {
        quantities.push({ inventoryItemId: sv.inventoryItem.id, locationId, quantity: Math.max(0, Math.floor(v.quantity || 0)) });
      }
    }
    if (quantities.length) {
      const inv = await client.graphql(INVENTORY_SET_MUTATION, {
        input: { name: "available", reason: "correction", ignoreCompareQuantity: true, quantities },
      });
      const invErrors = inv.inventorySetQuantities?.userErrors || [];
      if (invErrors.length) inventoryWarning = invErrors.map((e) => e.message).join("; ");
    }
  } catch (err) {
    inventoryWarning = shopifyErrorMessage(err);
  }

  productRepo.updateSyncResult(product.id, {
    shopifyProductId: numericId(result.id),
    shopifyStatus: status.toLowerCase(),
    syncStatus: "synced",
    syncError: null,
  });

  return {
    shopifyProductId: numericId(result.id),
    status: status.toLowerCase(),
    variantsSynced: returned.length,
    imagesSynced: (input.files || []).length,
    inventoryWarning,
  };
}

module.exports = { syncProductToShopify, getConnection };
