-- Insytix schema (SQLite). Every tenant-owned row carries tenant_id.

CREATE TABLE IF NOT EXISTS tenants (
  id                   TEXT PRIMARY KEY,
  store_name           TEXT NOT NULL,
  shopify_domain       TEXT,
  shopify_token_enc    TEXT,
  shopify_api_version  TEXT,
  shopify_location_id  TEXT,
  created_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  name           TEXT,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'owner',
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id),
  name              TEXT NOT NULL,
  method            TEXT NOT NULL,                 -- 'csv' | 'ftp'
  status            TEXT NOT NULL DEFAULT 'active',-- 'active' | 'paused'
  ftp_protocol      TEXT,                          -- 'ftp' | 'ftps' | 'sftp'
  ftp_host          TEXT,
  ftp_port          INTEGER,
  ftp_username      TEXT,
  ftp_password_enc  TEXT,
  ftp_remote_path   TEXT,                          -- path to feed file on the server
  column_map        TEXT,                          -- optional JSON column overrides
  last_ingest_at    TEXT,
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL REFERENCES tenants(id),
  supplier_id         TEXT NOT NULL REFERENCES suppliers(id),
  product_key         TEXT NOT NULL,               -- grouping key: group:x | bundle:x | sku:x
  title               TEXT,
  description         TEXT,
  vendor              TEXT,
  category            TEXT,                         -- supplier's own category, verbatim
  product_type        TEXT NOT NULL DEFAULT 'simple', -- simple | variant | bundle
  is_bundle           INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft',-- intended publish status: active | draft
  eligible            INTEGER NOT NULL DEFAULT 0,
  eligibility_reason  TEXT,                         -- JSON array of reasons blocking "active"
  total_quantity      INTEGER NOT NULL DEFAULT 0,
  min_price           REAL,
  max_price           REAL,
  image_count         INTEGER NOT NULL DEFAULT 0,
  variant_count       INTEGER NOT NULL DEFAULT 0,
  shopify_product_id  TEXT,
  shopify_status      TEXT,
  sync_status         TEXT NOT NULL DEFAULT 'unsynced', -- unsynced | synced | error
  sync_error          TEXT,
  synced_at           TEXT,
  raw_attrs           TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  UNIQUE(tenant_id, supplier_id, product_key)
);

CREATE TABLE IF NOT EXISTS variants (
  id                          TEXT PRIMARY KEY,
  tenant_id                   TEXT NOT NULL REFERENCES tenants(id),
  supplier_id                 TEXT NOT NULL REFERENCES suppliers(id),
  product_id                  TEXT NOT NULL REFERENCES products(id),
  sku                         TEXT NOT NULL,
  barcode                     TEXT,
  option1_name                TEXT,
  option1_value               TEXT,
  option2_name                TEXT,
  option2_value               TEXT,
  option3_name                TEXT,
  option3_value               TEXT,
  price                       REAL,
  compare_at_price            REAL,
  quantity                    INTEGER NOT NULL DEFAULT 0,
  position                    INTEGER NOT NULL DEFAULT 1,
  shopify_variant_id          TEXT,
  shopify_inventory_item_id   TEXT,
  UNIQUE(tenant_id, supplier_id, sku)
);

CREATE TABLE IF NOT EXISTS product_images (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  product_id  TEXT NOT NULL REFERENCES products(id),
  src         TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  is_hero     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bundle_components (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL,
  product_id       TEXT NOT NULL REFERENCES products(id),
  component_sku    TEXT NOT NULL,
  component_title  TEXT,
  quantity         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  supplier_id       TEXT NOT NULL,
  method            TEXT,
  source            TEXT,
  status            TEXT NOT NULL,                 -- success | failed
  total_rows        INTEGER NOT NULL DEFAULT 0,
  products_created  INTEGER NOT NULL DEFAULT 0,
  products_updated  INTEGER NOT NULL DEFAULT 0,
  variants_count    INTEGER NOT NULL DEFAULT 0,
  images_count      INTEGER NOT NULL DEFAULT 0,
  bundles_count     INTEGER NOT NULL DEFAULT 0,
  message           TEXT,
  created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_supplier ON products(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_status   ON products(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_sync     ON products(tenant_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_variants_product         ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_images_product           ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_components_product        ON bundle_components(product_id);
CREATE INDEX IF NOT EXISTS idx_runs_tenant_supplier     ON ingestion_runs(tenant_id, supplier_id);
