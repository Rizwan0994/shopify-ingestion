"use strict";

const db = require("../db");
const { newId, now } = require("../lib/util");

const insertProductStmt = db.prepare(
  `INSERT INTO products
     (id, tenant_id, supplier_id, product_key, title, description, vendor, category,
      product_type, is_bundle, status, eligible, eligibility_reason, total_quantity,
      min_price, max_price, image_count, variant_count, sync_status, raw_attrs, created_at, updated_at)
   VALUES
     (@id, @tenant_id, @supplier_id, @product_key, @title, @description, @vendor, @category,
      @product_type, @is_bundle, @status, @eligible, @eligibility_reason, @total_quantity,
      @min_price, @max_price, @image_count, @variant_count, 'unsynced', @raw_attrs, @created_at, @updated_at)`
);

const updateProductStmt = db.prepare(
  `UPDATE products SET
     title = @title, description = @description, vendor = @vendor, category = @category,
     product_type = @product_type, is_bundle = @is_bundle, status = @status,
     eligible = @eligible, eligibility_reason = @eligibility_reason, total_quantity = @total_quantity,
     min_price = @min_price, max_price = @max_price, image_count = @image_count,
     variant_count = @variant_count, raw_attrs = @raw_attrs, updated_at = @updated_at
   WHERE id = @id`
);

const upsertVariantStmt = db.prepare(
  `INSERT INTO variants
     (id, tenant_id, supplier_id, product_id, sku, barcode,
      option1_name, option1_value, option2_name, option2_value, option3_name, option3_value,
      price, compare_at_price, quantity, position)
   VALUES
     (@id, @tenant_id, @supplier_id, @product_id, @sku, @barcode,
      @option1_name, @option1_value, @option2_name, @option2_value, @option3_name, @option3_value,
      @price, @compare_at_price, @quantity, @position)
   ON CONFLICT(tenant_id, supplier_id, sku) DO UPDATE SET
      product_id = excluded.product_id, barcode = excluded.barcode,
      option1_name = excluded.option1_name, option1_value = excluded.option1_value,
      option2_name = excluded.option2_name, option2_value = excluded.option2_value,
      option3_name = excluded.option3_name, option3_value = excluded.option3_value,
      price = excluded.price, compare_at_price = excluded.compare_at_price,
      quantity = excluded.quantity, position = excluded.position`
);

/**
 * Upsert a whole product "graph" (product + variants + images + components) atomically.
 * Keyed on (tenant_id, supplier_id, product_key). Preserves Shopify linkage on re-ingest.
 * Returns { created: boolean, productId }.
 */
function upsertProductGraph(tenantId, supplierId, p) {
  const tx = db.transaction(() => {
    const existing = db
      .prepare(`SELECT id FROM products WHERE tenant_id = ? AND supplier_id = ? AND product_key = ?`)
      .get(tenantId, supplierId, p.product_key);

    const productId = existing ? existing.id : newId();
    const base = {
      id: productId,
      tenant_id: tenantId,
      supplier_id: supplierId,
      product_key: p.product_key,
      title: p.title || null,
      description: p.description || null,
      vendor: p.vendor || null,
      category: p.category || null,
      product_type: p.product_type || "simple",
      is_bundle: p.is_bundle ? 1 : 0,
      status: p.status || "draft",
      eligible: p.eligible ? 1 : 0,
      eligibility_reason: JSON.stringify(p.eligibility_reason || []),
      total_quantity: p.total_quantity || 0,
      min_price: p.min_price ?? null,
      max_price: p.max_price ?? null,
      image_count: (p.images || []).length,
      variant_count: (p.variants || []).length,
      raw_attrs: p.raw_attrs ? JSON.stringify(p.raw_attrs) : null,
      updated_at: now(),
    };

    if (existing) {
      updateProductStmt.run(base);
    } else {
      insertProductStmt.run({ ...base, created_at: now() });
    }

    // Variants: upsert by sku (keeps shopify ids), then drop variants that vanished.
    const incomingSkus = [];
    (p.variants || []).forEach((v, i) => {
      upsertVariantStmt.run({
        id: newId(),
        tenant_id: tenantId,
        supplier_id: supplierId,
        product_id: productId,
        sku: v.sku,
        barcode: v.barcode || null,
        option1_name: v.option1_name || null,
        option1_value: v.option1_value || null,
        option2_name: v.option2_name || null,
        option2_value: v.option2_value || null,
        option3_name: v.option3_name || null,
        option3_value: v.option3_value || null,
        price: v.price ?? null,
        compare_at_price: v.compare_at_price ?? null,
        quantity: v.quantity || 0,
        position: v.position || i + 1,
      });
      incomingSkus.push(v.sku);
    });
    // Remove variants of this product no longer present in the feed.
    const current = db.prepare(`SELECT sku FROM variants WHERE product_id = ?`).all(productId);
    for (const row of current) {
      if (!incomingSkus.includes(row.sku)) {
        db.prepare(`DELETE FROM variants WHERE product_id = ? AND sku = ?`).run(productId, row.sku);
      }
    }

    // Images: replace wholesale (cheap, order/hero may change).
    db.prepare(`DELETE FROM product_images WHERE product_id = ?`).run(productId);
    (p.images || []).forEach((img, i) => {
      db.prepare(
        `INSERT INTO product_images (id, tenant_id, product_id, src, position, is_hero)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(newId(), tenantId, productId, img.src, img.position ?? i, img.is_hero ? 1 : 0);
    });

    // Bundle components: replace wholesale.
    db.prepare(`DELETE FROM bundle_components WHERE product_id = ?`).run(productId);
    (p.components || []).forEach((c) => {
      db.prepare(
        `INSERT INTO bundle_components (id, tenant_id, product_id, component_sku, component_title, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(newId(), tenantId, productId, c.component_sku, c.component_title || null, c.quantity || 1);
    });

    return { created: !existing, productId };
  });
  return tx();
}

function buildFilter(tenantId, f = {}) {
  const where = ["p.tenant_id = @tenant_id"];
  const params = { tenant_id: tenantId };
  if (f.supplierId) {
    where.push("p.supplier_id = @supplierId");
    params.supplierId = f.supplierId;
  }
  if (f.category) {
    where.push("p.category = @category");
    params.category = f.category;
  }
  if (f.status) {
    where.push("p.status = @status");
    params.status = f.status;
  }
  if (f.syncStatus) {
    where.push("p.sync_status = @syncStatus");
    params.syncStatus = f.syncStatus;
  }
  if (f.type) {
    where.push("p.product_type = @type");
    params.type = f.type;
  }
  if (f.search) {
    where.push(
      `(p.title LIKE @search OR p.id IN (SELECT product_id FROM variants v WHERE v.sku LIKE @search))`
    );
    params.search = `%${f.search}%`;
  }
  return { clause: where.join(" AND "), params };
}

/** Paginated product list with the supplier name and hero image joined in. */
function list(tenantId, f = {}) {
  const page = Math.max(1, Number(f.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(f.pageSize) || 20));
  const { clause, params } = buildFilter(tenantId, f);

  const total = db.prepare(`SELECT COUNT(*) AS c FROM products p WHERE ${clause}`).get(params).c;

  const items = db
    .prepare(
      `SELECT p.*, s.name AS supplier_name,
              (SELECT src FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_hero DESC, pi.position ASC LIMIT 1) AS hero_image
         FROM products p
         JOIN suppliers s ON s.id = p.supplier_id
        WHERE ${clause}
        ORDER BY p.updated_at DESC
        LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  return { items: items.map(hydrateListRow), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

function hydrateListRow(row) {
  return { ...row, eligibility_reason: safeJson(row.eligibility_reason, []) };
}

function safeJson(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

function getDetail(tenantId, id) {
  const product = db
    .prepare(
      `SELECT p.*, s.name AS supplier_name, s.method AS supplier_method
         FROM products p JOIN suppliers s ON s.id = p.supplier_id
        WHERE p.tenant_id = ? AND p.id = ?`
    )
    .get(tenantId, id);
  if (!product) return null;
  product.eligibility_reason = safeJson(product.eligibility_reason, []);
  product.raw_attrs = safeJson(product.raw_attrs, {});
  product.variants = db.prepare(`SELECT * FROM variants WHERE product_id = ? ORDER BY position ASC`).all(id);
  product.images = db.prepare(`SELECT * FROM product_images WHERE product_id = ? ORDER BY is_hero DESC, position ASC`).all(id);
  product.components = db.prepare(`SELECT * FROM bundle_components WHERE product_id = ? ORDER BY component_sku ASC`).all(id);
  return product;
}

function getForSync(tenantId, id) {
  return getDetail(tenantId, id);
}

function distinctCategories(tenantId) {
  return db
    .prepare(`SELECT DISTINCT category FROM products WHERE tenant_id = ? AND category IS NOT NULL AND category <> '' ORDER BY category ASC`)
    .all(tenantId)
    .map((r) => r.category);
}

function counts(tenantId) {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN is_bundle = 1 THEN 1 ELSE 0 END) AS bundles,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
         SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) AS synced,
         SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) AS sync_errors,
         SUM(CASE WHEN eligible = 1 AND sync_status <> 'synced' THEN 1 ELSE 0 END) AS ready_to_sync
       FROM products WHERE tenant_id = ?`
    )
    .get(tenantId);
  // SUM over zero rows returns null — normalise to 0.
  Object.keys(row).forEach((k) => (row[k] = row[k] || 0));
  return row;
}

/** Top categories by product count (for the dashboard chart). */
function breakdownByCategory(tenantId, limit = 8) {
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(category, ''), 'Uncategorized') AS label, COUNT(*) AS value
         FROM products WHERE tenant_id = ?
        GROUP BY label ORDER BY value DESC LIMIT ?`
    )
    .all(tenantId, limit);
}

/** Products per supplier (for the dashboard chart). */
function breakdownBySupplier(tenantId) {
  return db
    .prepare(
      `SELECT s.name AS label, COUNT(p.id) AS value
         FROM suppliers s LEFT JOIN products p ON p.supplier_id = s.id
        WHERE s.tenant_id = ?
        GROUP BY s.id ORDER BY value DESC`
    )
    .all(tenantId);
}

function updateSyncResult(id, { shopifyProductId, shopifyStatus, syncStatus, syncError }) {
  db.prepare(
    `UPDATE products
        SET shopify_product_id = COALESCE(?, shopify_product_id),
            shopify_status = ?, sync_status = ?, sync_error = ?, synced_at = ?
      WHERE id = ?`
  ).run(
    shopifyProductId || null,
    shopifyStatus || null,
    syncStatus,
    syncError || null,
    syncStatus === "synced" ? now() : null,
    id
  );
}

function updateVariantShopify(variantId, { shopifyVariantId, shopifyInventoryItemId }) {
  db.prepare(
    `UPDATE variants SET shopify_variant_id = ?, shopify_inventory_item_id = ? WHERE id = ?`
  ).run(shopifyVariantId || null, shopifyInventoryItemId || null, variantId);
}

module.exports = {
  upsertProductGraph,
  list,
  getDetail,
  getForSync,
  distinctCategories,
  counts,
  breakdownByCategory,
  breakdownBySupplier,
  updateSyncResult,
  updateVariantShopify,
};
