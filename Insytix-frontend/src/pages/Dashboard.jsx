import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package, Boxes, Truck, RefreshCw, CheckCircle2, UploadCloud, Store, ArrowRight, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, CartesianGrid,
} from "recharts";
import api from "../lib/api";
import { PageLoader, EmptyState } from "../components/ui";
import { timeAgo } from "../lib/format";
import { useToast } from "../context/ToastContext";

const PIE_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6", "#f43f5e", "#6366f1"];

function StatTile({ icon: Icon, label, value, tint }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-500">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${tint}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(setData).catch((e) => toast.error(e.message));
  }, []); // eslint-disable-line

  if (!data) return <PageLoader label="Loading your dashboard…" />;

  const c = data.counts;
  const tiles = [
    { icon: Package, label: "Products", value: c.total, tint: "bg-brand-50 text-brand-600" },
    { icon: CheckCircle2, label: "Active", value: c.active, tint: "bg-accent-500/10 text-accent-600" },
    { icon: Boxes, label: "Bundles", value: c.bundles, tint: "bg-amber-500/10 text-amber-600" },
    { icon: Truck, label: "Suppliers", value: data.suppliers.length, tint: "bg-blue-500/10 text-blue-600" },
    { icon: RefreshCw, label: "Synced to Shopify", value: c.synced, tint: "bg-brand-50 text-brand-600" },
    { icon: UploadCloud, label: "Ready to sync", value: c.ready_to_sync, tint: "bg-accent-500/10 text-accent-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Shopify connection banner */}
      {!data.shopify.connected && (
        <div className="card flex flex-col items-start justify-between gap-4 border-brand-200 bg-gradient-to-r from-brand-50 to-white p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Store size={20} /></span>
            <div>
              <p className="font-semibold text-ink-900">Connect your Shopify store</p>
              <p className="text-sm text-ink-500">Add your store domain and Admin API token to start publishing products.</p>
            </div>
          </div>
          <Link to="/settings" className="btn-primary shrink-0">Connect store <ArrowRight size={16} /></Link>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => <StatTile key={t.label} {...t} />)}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-1 font-semibold text-ink-900">Products by category</h3>
          <p className="mb-4 text-sm text-ink-500">Supplier categories, kept exactly as received.</p>
          {data.byCategory.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byCategory} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#eef2f7" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12, fill: "#475569" }} />
                <Tooltip cursor={{ fill: "#f5f3ff" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#8b5cf6" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
        </div>

        <div className="card p-5">
          <h3 className="mb-1 font-semibold text-ink-900">Catalog by supplier</h3>
          <p className="mb-4 text-sm text-ink-500">Where your products come from.</p>
          {data.bySupplier.some((s) => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.bySupplier.filter((s) => s.value > 0)} dataKey="value" nameKey="label"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {data.bySupplier.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {data.bySupplier.map((s, i) => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-ink-600">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {s.label} ({s.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent imports */}
      <div className="card p-5">
        <h3 className="mb-4 font-semibold text-ink-900">Recent imports</h3>
        {data.recentRuns.length ? (
          <ul className="divide-y divide-ink-100">
            {data.recentRuns.map((r) => (
              <li key={r.id} className="flex items-center gap-4 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${r.status === "success" ? "bg-accent-500/10 text-accent-600" : "bg-red-500/10 text-red-600"}`}>
                  {r.status === "success" ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">{r.message || `${r.method} import`}</p>
                  <p className="text-xs text-ink-500">{r.supplier_name} · {r.method?.toUpperCase()}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-400">{timeAgo(r.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={UploadCloud} title="No imports yet"
            action={<Link to="/suppliers" className="btn-primary">Add a supplier</Link>}>
            Add a supplier and import a feed to see activity here.
          </EmptyState>
        )}
      </div>
    </div>
  );
}

function ChartEmpty() {
  return <div className="grid h-[260px] place-items-center text-sm text-ink-400">No data yet — import a supplier feed.</div>;
}
