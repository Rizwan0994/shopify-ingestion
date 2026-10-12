"use strict";

const { resolveColumns } = require("./columnMap");
const { toNumber, toQuantity } = require("../../lib/util");

function cell(row, header) {
  if (!header) return "";
  const v = row[header];
  return v === undefined || v === null ? "" : String(v).trim();
}

/** Split an image cell into clean URLs (feeds use | ; , newline as separators). */
function parseImages(value) {
  if (!value) return [];
  const tokens = String(value)
    .split(/[\n|;,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const urls = tokens.filter((t) => /^(https?|ftp):\/\//i.test(t));
  // If nothing matched but the whole value is a single url-ish token, keep it.
  if (!urls.length && /^(https?|ftp):\/\//i.test(value.trim())) return [value.trim()];
  return [...new Set(urls)];
}

/** Parse a components cell like "SKU1:2;SKU2:1" or "SKU1,SKU2". */
function parseComponents(value) {
  if (!value) return [];
  const sep = value.includes(";") || value.includes("|") ? /[;|]+/ : /,+/;
  return String(value)
    .split(sep)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([^:x*]+?)\s*[:x*]?\s*(\d+)?$/i);
      const sku = (m ? m[1] : part).trim();
      const qty = m && m[2] ? parseInt(m[2], 10) : 1;
      return { component_sku: sku, quantity: qty || 1 };
    })
    .filter((c) => c.component_sku);
}

function isBundleType(typeValue) {
  return /^(bundle|set|kit|package|pkg|collection set)$/i.test(String(typeValue || "").trim());
}

function firstNonEmpty(items, key) {
  for (const it of items) if (it[key]) return it[key];
  return null;
}

/**
 * Normalise parsed rows into an array of product graphs.
 * Returns { products: [...], stats: { rows, variants, images, bundles } }.
 */
function normalizeRows(rows, overrides = {}) {
  if (!rows.length) return { products: [], stats: { rows: 0, variants: 0, images: 0, bundles: 0 } };

  const headers = Object.keys(rows[0]);
  const { fields, options } = resolveColumns(headers, overrides);

  // Pass 1: build normalised items + a sku->quantity map (for bundle availability).
  const items = [];
  const stockBySku = {};
  for (const row of rows) {
    const sku = cell(row, fields.sku);
    if (!sku) continue;

    const optionPairs = [];
    for (const opt of options) {
      const name = opt.nameColumn ? cell(row, opt.nameColumn) : opt.name;
      const value = cell(row, opt.header);
      if (name && value) optionPairs.push({ name, value });
    }

    const components = parseComponents(cell(row, fields.components));
    const item = {
      sku,
      title: cell(row, fields.title) || null,
      description: cell(row, fields.description) || null,
      category: cell(row, fields.category) || null, // supplier's own category, verbatim
      vendor: cell(row, fields.vendor) || null,
      price: toNumber(cell(row, fields.price)),
      compareAtPrice: toNumber(cell(row, fields.compareAtPrice)),
      quantity: toQuantity(cell(row, fields.quantity)),
      images: parseImages(cell(row, fields.image)),
      barcode: cell(row, fields.barcode) || null,
      type: cell(row, fields.type) || null,
      groupKey: cell(row, fields.groupKey) || null,
      components,
      optionPairs,
      raw: row,
    };
    stockBySku[sku] = item.quantity;
    items.push(item);
  }

  // Pass 2: group items into products.
  const groups = new Map();
  for (const item of items) {
    const bundle = isBundleType(item.type) || item.components.length > 0;
    let key;
    if (bundle) key = `bundle:${item.sku}`;
    else if (item.groupKey) key = `group:${item.groupKey}`;
    else key = `sku:${item.sku}`;

    if (!groups.has(key)) groups.set(key, { key, bundle, items: [] });
    groups.get(key).items.push(item);
  }

  // Pass 3: assemble each product graph.
  const products = [];
  let variantsTotal = 0;
  let imagesTotal = 0;
  let bundlesTotal = 0;

  for (const group of groups.values()) {
    const gi = group.items;
    const isBundle = group.bundle;

    // Variants (dedupe by sku).
    const seen = new Set();
    const variants = [];
    for (const it of gi) {
      if (seen.has(it.sku)) continue;
      seen.add(it.sku);
      variants.push({
        sku: it.sku,
        barcode: it.barcode,
        option1_name: it.optionPairs[0]?.name || null,
        option1_value: it.optionPairs[0]?.value || null,
        option2_name: it.optionPairs[1]?.name || null,
        option2_value: it.optionPairs[1]?.value || null,
        option3_name: it.optionPairs[2]?.name || null,
        option3_value: it.optionPairs[2]?.value || null,
        price: it.price,
        compare_at_price: it.compareAtPrice,
        quantity: it.quantity,
        position: variants.length + 1,
        _components: it.components,
      });
    }

    // Images: union across the group, hero first, deduped.
    const imageSet = [];
    for (const it of gi) for (const src of it.images) if (!imageSet.includes(src)) imageSet.push(src);
    const images = imageSet.map((src, i) => ({ src, position: i, is_hero: i === 0 ? 1 : 0 }));

    // Components (bundles): resolve titles + availability from the feed when possible.
    let components = [];
    if (isBundle) {
      const raw = gi.find((it) => it.components.length)?.components || [];
      components = raw.map((c) => ({
        component_sku: c.component_sku,
        component_title: items.find((it) => it.sku === c.component_sku)?.title || null,
        quantity: c.quantity,
      }));
    }

    // Quantities.
    let totalQuantity = variants.reduce((s, v) => s + (v.quantity || 0), 0);
    if (isBundle) {
      const own = variants[0]?.quantity || 0;
      if (own > 0) {
        totalQuantity = own;
      } else if (components.length) {
        // Buildable sets = min over components of floor(available / required).
        totalQuantity = Math.min(
          ...components.map((c) => Math.floor((stockBySku[c.component_sku] || 0) / (c.quantity || 1)))
        );
        if (!Number.isFinite(totalQuantity)) totalQuantity = 0;
      }
      // Keep the single bundle variant's stock in step with the buildable quantity so the
      // detail view and the Shopify inventory push both reflect what can actually ship.
      if (variants[0]) variants[0].quantity = totalQuantity;
    }

    const prices = variants.map((v) => v.price).filter((p) => p !== null && p > 0);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    const productType = isBundle ? "bundle" : variants.length > 1 ? "variant" : "simple";

    // Eligibility gates (mirrors the production rules: image + price + stock).
    const reasons = [];
    if (!images.length) reasons.push("no_image");
    if (minPrice === null) reasons.push("no_price");
    if (totalQuantity <= 0) reasons.push("out_of_stock");
    const eligible = reasons.length === 0;

    variants.forEach((v) => delete v._components);
    variantsTotal += variants.length;
    imagesTotal += images.length;
    if (isBundle) bundlesTotal += 1;

    products.push({
      product_key: group.key,
      title: firstNonEmpty(gi, "title") || gi[0].sku,
      description: firstNonEmpty(gi, "description"),
      category: firstNonEmpty(gi, "category"),
      vendor: firstNonEmpty(gi, "vendor"),
      product_type: productType,
      is_bundle: isBundle,
      status: eligible ? "active" : "draft",
      eligible,
      eligibility_reason: reasons,
      total_quantity: totalQuantity,
      min_price: minPrice,
      max_price: maxPrice,
      variants,
      images,
      components,
      raw_attrs: gi[0].raw,
    });
  }

  return {
    products,
    stats: { rows: items.length, variants: variantsTotal, images: imagesTotal, bundles: bundlesTotal },
  };
}

module.exports = { normalizeRows, parseImages, parseComponents };
