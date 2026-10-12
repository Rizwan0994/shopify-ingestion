# Insytix

**Supplier-to-Shopify catalog orchestration — SaaS platform (Final Year Project).**

Insytix lets a merchant (tenant) sign up, connect their suppliers, and publish products to
their Shopify store. Each supplier's catalog is imported — by **CSV upload** or a direct
**FTP/SFTP feed** — then automatically normalized into products, variants, bundles and images,
keeping the supplier's **own categories**. Eligible products can be pushed to Shopify one at a
time through the GraphQL Admin API.

This is a focused, self-contained rebuild of a larger production system, scoped for a mid-term
evaluation demo. It runs end-to-end on a single machine with **no external database or services**.

```
fyp/
├── Insytix-backend     → Node.js + Express + SQLite REST API
└── Insytix-frontend    → React + Vite + Tailwind single-page app
```

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **Tenant signup (SaaS)** | Self-serve registration creates a workspace + owner login (JWT auth). Fully multi-tenant — every record is scoped to its tenant. |
| **Suppliers** | Add suppliers **directly** (no admin approval) by **CSV upload** or **FTP/SFTP feed** (host, port, protocol, credentials, file path), with a live "Test connection". |
| **Ingestion & normalization** | One pipeline parses the feed, auto-detects columns, groups **variants**, detects **bundles** (with components & buildable stock), aggregates **images**, and keeps the supplier's **categories verbatim**. |
| **Products** | Searchable, filterable catalog (supplier, category, status, sync state, type) with a detail drawer showing variants, images, components and publish eligibility. |
| **Shopify sync** | Connect a store with an Admin API token, then **sync a single product** to Shopify via the **GraphQL Admin API** (latest version, `productSet` + inventory). Eligible → *Active*, otherwise → *Draft*. |
| **Dashboard** | Live counts, products-by-category and catalog-by-supplier charts, and a recent-imports feed. |

---

## 🧱 Tech stack

- **Backend:** Node.js, Express, **better-sqlite3** (embedded SQL database — zero install),
  JWT auth (bcrypt-hashed passwords), `csv-parse`, `basic-ftp` / `ssh2-sftp-client`, `axios`,
  AES-256-GCM encryption for stored secrets.
- **Frontend:** React 18, Vite, React Router, Tailwind CSS, Recharts, lucide-react, axios.

---

## 🚀 Quick start

> Requires **Node.js 18+** (tested on Node 22). Open two terminals.

### 1 — Backend

```bash
cd Insytix-backend
npm install
npm run seed      # optional: creates a demo login with a catalog already imported
npm run dev       # starts the API on http://localhost:8080
```

### 2 — Frontend

```bash
cd Insytix-frontend
npm install
npm run dev       # starts the app on http://localhost:5173
```

Open **http://localhost:5173**.

### Demo login (after `npm run seed`)

```
email:    demo@insytix.app
password: demo12345
```

…or just click **Create an account** to make a fresh workspace.

---

## 🧪 Try the two supplier methods

**CSV upload** — On the **Suppliers** page, add a supplier with *CSV upload*, then click
**Upload feed** and choose `Insytix-backend/src/sample-data/furniture-feed.csv`.

**FTP feed (fully offline demo)** — In a third terminal, start the bundled demo FTP server:

```bash
cd Insytix-backend
npm run ftp-demo   # serves the sample feed on ftp://127.0.0.1:2121
```

Then add a supplier with *FTP / SFTP feed* and click **Use demo FTP server** (pre-fills
host `127.0.0.1`, port `2121`, user `insytix`, password `insytix123`, path `/furniture-feed.csv`).
**Test connection**, **Add supplier**, then **Fetch now** to import over real FTP.

The sample feed is designed to exercise everything: simple products, a 3-colour variant group,
a colour × size variant group, two bundles (one in stock, one out of stock), and products that
are held back as *Draft* for a missing image / price / stock.

---

## 🔗 Connecting Shopify (for the sync demo)

1. In your Shopify admin: **Settings → Apps and sales channels → Develop apps → Create an app**.
2. Under **Configuration**, grant `write_products` and `write_inventory`.
3. **Install** the app and copy the **Admin API access token** (`shpat_…`).
4. In Insytix, go to **Settings → Store**, enter your `*.myshopify.com` domain + token, **Save**,
   then **Test connection**.
5. Open any product and click **Sync to Shopify**.

> See [Insytix-backend/README.md](Insytix-backend/README.md) for the full API reference and
> design notes.
