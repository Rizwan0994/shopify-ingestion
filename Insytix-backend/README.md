# Insytix — Backend API

Node.js + Express REST API backed by an embedded **SQLite** database (`better-sqlite3`), so it
runs with no external services. JWT auth, multi-tenant, with the supplier-ingestion and
single-product Shopify-sync pipelines.

## Run

```bash
npm install
npm run seed     # optional demo data (login: demo@insytix.app / demo12345)
npm run dev      # nodemon, http://localhost:8080   (or: npm start)
npm run ftp-demo # optional: local FTP server for the FTP supplier demo
```

Configuration is read from `.env` (see [.env.example](.env.example)) — the defaults work as-is.
The database file is created at `data/insytix.db` on first run.

## Project layout

```
src/
├── config/env.js            Environment + paths
├── db/                      SQLite connection, schema.sql, seed.js
├── lib/                     jwt, crypto (AES-256-GCM), http helpers, presenters
├── middleware/              requireAuth, error handling
├── models/                  Repositories (tenant, user, supplier, product, ingestion run)
├── services/
│   ├── ingestion/           parseFeed → columnMap → normalize → ftpClient → ingest
│   └── shopify/             client (GraphQL) + syncProduct
├── controllers/             auth, dashboard, supplier, product, store
├── routes/                  /api/* routers
├── scripts/ftpDemoServer.js Bundled demo FTP server
└── sample-data/             furniture-feed.csv
```

## API reference

Base URL: `http://localhost:8080/api`. All responses are `{ success, data }` or
`{ success:false, message }`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/auth/signup` | `{ storeName, name?, email, password }` | Creates tenant + owner, returns `{ token, user, tenant }` |
| POST | `/auth/login` | `{ email, password }` | Returns `{ token, user, tenant }` |
| GET | `/auth/me` | — | Current user + tenant |

### Dashboard
| GET | `/dashboard/stats` | counts, suppliers, recent imports, category/supplier breakdowns |

### Suppliers
| Method | Path | Notes |
|--------|------|-------|
| GET | `/suppliers` | List with product counts |
| POST | `/suppliers` | Create (`method: "csv" \| "ftp"`; FTP: `protocol, host, port, username, password, remotePath`) |
| POST | `/suppliers/test-connection` | Test FTP details before saving |
| DELETE | `/suppliers/:id` | Delete supplier + its catalog |
| POST | `/suppliers/:id/upload` | Multipart `file` → ingest a CSV |
| POST | `/suppliers/:id/fetch` | Pull the feed over FTP/SFTP → ingest |
| POST | `/suppliers/:id/test` | Test a saved supplier's connection |
| GET | `/suppliers/:id/runs` | Import history |

### Products
| Method | Path | Notes |
|--------|------|-------|
| GET | `/products` | Query: `search, supplierId, category, status, syncStatus, type, page, pageSize` |
| GET | `/products/meta/filters` | Filter option values |
| GET | `/products/:id` | Detail with variants, images, components |
| POST | `/products/:id/sync` | Sync this product to Shopify (GraphQL Admin API) |

### Store (Shopify connection)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/store` | Connection state (never returns the token) |
| PUT | `/store` | `{ shopifyDomain, accessToken, apiVersion? }` (token encrypted at rest) |
| POST | `/store/test` | Verify credentials against Shopify |
| DELETE | `/store` | Disconnect |

## How ingestion works

`parseFeed` (delimiter-sniffing CSV/TSV parse) → `columnMap` (explicit overrides, else header
heuristics for sku/title/price/qty/category/image/options/components) → `normalize`:

- Rows are grouped into products: a shared **group key** → one product with multiple **variants**
  (colour/size options); a `type=bundle` row or a `components` column → a **bundle** with a
  component list and a *buildable* stock derived from its components.
- Images are aggregated per product (hero first); the supplier's **category is stored verbatim**.
- **Eligibility** gates publish status: a product needs an image, a price, and stock to go up as
  *Active* — otherwise it syncs as *Draft* with the reason recorded.

The same `ingestBuffer` function powers both the CSV-upload and FTP-fetch paths, keyed on
`(tenant, supplier, supplierSku)` so re-imports update in place.

## How Shopify sync works

Sync uses the **GraphQL Admin API** (Shopify's current, supported API — the REST product
endpoints are legacy as of 2024-10), on the latest version (`2026-10` by default).

`syncProduct` builds a `ProductSetInput` (title, descriptionHtml, vendor, `productType` = the
supplier's category, status, declarative options + variants with `optionValues`, prices, barcodes,
and image `files`) and runs one **`productSet`** mutation — which creates or updates the product
declaratively (matched by its stored Shopify id). It then sets per-variant stock at the store's
primary location with **`inventorySetQuantities`** (`ignoreCompareQuantity: true`). Eligible
products publish as `ACTIVE`, otherwise `DRAFT`. Shopify ids are written back to the product and
its variants.
