# Insytix — Frontend

React 18 + Vite single-page app for the Insytix platform, styled with Tailwind CSS.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

The dev server proxies `/api` to the backend at `http://localhost:8080` (see `vite.config.js`),
so **start the backend first**. No environment variables are needed for local development.

To point at a backend on a different origin, set `VITE_API_PROXY` (see [.env.example](.env.example)).

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Structure

```
src/
├── main.jsx               App bootstrap (Router + Auth + Toast providers)
├── App.jsx                Routes + protected-route guards
├── lib/                   axios client, formatting helpers
├── context/               AuthContext, ToastContext
├── components/            Layout, Logo, AuthShell, ProductDetail, AddSupplierModal, ui primitives
└── pages/                 Login, Signup, Dashboard, Products, Suppliers, Settings
```

## Pages

- **Dashboard** — stat tiles, products-by-category & catalog-by-supplier charts, recent imports.
- **Products** — filters (search, supplier, category, status, sync state, type) + detail drawer
  with variants, images, bundle components, eligibility, and per-product **Sync to Shopify**.
- **Suppliers** — add a supplier (CSV upload or FTP feed), upload/fetch/test, and import history.
- **Settings → Store** — connect/disconnect the Shopify store (domain + Admin API token).
