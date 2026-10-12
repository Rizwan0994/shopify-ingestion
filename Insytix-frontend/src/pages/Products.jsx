import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Package, Boxes, Layers, Eye, RefreshCw, PackageSearch, Image as ImageIcon } from "lucide-react";
import api from "../lib/api";
import { PageLoader, EmptyState, StatusBadge, SyncBadge, Badge, Pagination, Spinner } from "../components/ui";
import { priceRange } from "../lib/format";
import { useToast } from "../context/ToastContext";
import ProductDetail from "../components/ProductDetail";

const TYPE_TABS = [
  { key: "", label: "All", icon: Layers },
  { key: "simple", label: "Individual", icon: Package },
  { key: "variant", label: "Variants", icon: Layers },
  { key: "bundle", label: "Bundles", icon: Boxes },
];

function Thumb({ src, size = "h-12 w-12" }) {
  const [err, setErr] = useState(false);
  if (!src || err)
    return <div className={`grid ${size} shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-300`}><ImageIcon size={18} /></div>;
  return <img src={src} onError={() => setErr(true)} className={`${size} shrink-0 rounded-lg border border-ink-100 object-cover`} alt="" />;
}

export default function Products() {
  const toast = useToast();
  const [filters, setFilters] = useState({ search: "", supplierId: "", category: "", status: "", syncStatus: "", type: "", page: 1 });
  const [meta, setMeta] = useState({ categories: [], suppliers: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [openId, setOpenId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  useEffect(() => { api.get("/products/meta/filters").then(setMeta).catch(() => {}); }, []);

  // Debounce the free-text search into the filter state.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search: searchInput, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries({ ...filters, pageSize: 12 }).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  }, [filters]);

  function load() {
    setLoading(true);
    api.get(`/products?${query}`).then(setResult).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, [query]); // eslint-disable-line

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  async function quickSync(id) {
    setSyncingId(id);
    try {
      const r = await api.post(`/products/${id}/sync`);
      toast.success(`Synced to Shopify as ${r.status}${r.inventoryWarning ? " (inventory warning)" : ""}.`);
      load();
    } catch (e) {
      toast.error(e.message);
      load();
    } finally {
      setSyncingId(null);
    }
  }

  const items = result?.items || [];

  return (
    <div className="space-y-5">
      {/* Type tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => set("type", key)}
            className={`btn ${filters.type === key ? "bg-ink-900 text-white" : "btn-outline"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
        {result && <span className="ml-auto text-sm text-ink-500">{result.total} product{result.total === 1 ? "" : "s"}</span>}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-10" placeholder="Search title or SKU…" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <select className="input" value={filters.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">All suppliers</option>
            {meta.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={filters.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">All categories</option>
            {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
          <select className="input" value={filters.syncStatus} onChange={(e) => set("syncStatus", e.target.value)}>
            <option value="">Any sync state</option>
            <option value="unsynced">Not synced</option>
            <option value="synced">Synced</option>
            <option value="error">Sync error</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading && !result ? (
        <PageLoader label="Loading products…" />
      ) : items.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No products found"
          action={<Link to="/suppliers" className="btn-primary">Import from a supplier</Link>}>
          Adjust your filters, or import a supplier feed to populate your catalog.
        </EmptyState>
      ) : (
        <div className={`card divide-y divide-ink-100 ${loading ? "opacity-60" : ""}`}>
          {items.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <button onClick={() => setOpenId(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Thumb src={p.hero_image} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink-900">{p.title}</p>
                    {p.is_bundle ? <Badge className="bg-amber-500/10 text-amber-600">Bundle</Badge> : null}
                  </div>
                  <p className="truncate text-xs text-ink-500">
                    {p.category || "Uncategorized"} · {p.supplier_name}
                    {p.variant_count > 1 ? ` · ${p.variant_count} variants` : ""}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-6 sm:gap-8">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-ink-900">{priceRange(p.min_price, p.max_price)}</p>
                  <p className="text-xs text-ink-500">{p.total_quantity} in stock</p>
                </div>
                <div className="flex w-28 flex-col items-start gap-1">
                  <StatusBadge status={p.status} />
                  <SyncBadge status={p.sync_status} />
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-outline !px-3" onClick={() => setOpenId(p.id)} title="View details"><Eye size={16} /></button>
                  <button className="btn-primary !px-3" disabled={syncingId === p.id} onClick={() => quickSync(p.id)} title="Sync to Shopify">
                    {syncingId === p.id ? <Spinner size={16} /> : <RefreshCw size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && <Pagination page={result.page} totalPages={result.totalPages} onPage={(pg) => setFilters((f) => ({ ...f, page: pg }))} />}

      <ProductDetail productId={openId} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}
