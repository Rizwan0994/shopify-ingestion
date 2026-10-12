import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Store, KeyRound, Globe, CheckCircle2, Plug, Save, Unplug, Info } from "lucide-react";
import api from "../lib/api";
import { PageLoader, Spinner, Badge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const toast = useToast();
  const { tenant, setTenant } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "store";

  const [store, setStore] = useState(null);
  const [form, setForm] = useState({ shopifyDomain: "", accessToken: "", apiVersion: "" });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [shopInfo, setShopInfo] = useState(null);

  useEffect(() => {
    if (!params.get("tab")) setParams({ tab: "store" }, { replace: true });
  }, []); // eslint-disable-line

  function loadStore() {
    api.get("/store").then((s) => {
      setStore(s);
      setForm({ shopifyDomain: s.shopifyDomain || "", accessToken: "", apiVersion: s.apiVersion || "2026-10" });
    }).catch((e) => toast.error(e.message));
  }
  useEffect(loadStore, []); // eslint-disable-line

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.shopifyDomain.trim()) return toast.error("Enter your Shopify store domain.");
    if (!form.accessToken.trim()) return toast.error("Enter your Admin API access token.");
    setBusy(true);
    try {
      const s = await api.put("/store", form);
      toast.success("Shopify store connected.");
      setTenant({ ...tenant, shopifyDomain: s.shopifyDomain, shopifyConnected: true });
      setShopInfo(null);
      loadStore();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setTesting(true); setShopInfo(null);
    try {
      const r = await api.post("/store/test", form.accessToken ? form : {});
      setShopInfo(r);
      toast.success(`Connected to “${r.shopName}”.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect this Shopify store?")) return;
    try {
      await api.delete("/store", { data: { clearDomain: true } });
      toast.success("Store disconnected.");
      setShopInfo(null);
      setTenant({ ...tenant, shopifyDomain: null, shopifyConnected: false });
      loadStore();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!store) return <PageLoader label="Loading settings…" />;

  return (
    <div className="space-y-5">
      {/* Tab bar — Store only (per spec) */}
      <div className="flex gap-1 border-b border-ink-200">
        <button className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === "store" ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500"}`}>
          Store
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Connection form */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Store size={20} /></span>
            <div>
              <h3 className="font-semibold text-ink-900">Shopify connection</h3>
              <p className="text-sm text-ink-500">Connect your store to publish products.</p>
            </div>
            <div className="ml-auto">
              {store.shopifyConnected
                ? <Badge className="bg-accent-500/10 text-accent-600"><CheckCircle2 size={14} /> Connected</Badge>
                : <Badge className="bg-amber-500/10 text-amber-600">Not connected</Badge>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Store domain</label>
              <div className="relative">
                <Globe size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input className="input pl-10" placeholder="my-store.myshopify.com" value={form.shopifyDomain} onChange={setF("shopifyDomain")} />
              </div>
            </div>
            <div>
              <label className="label">Admin API access token</label>
              <div className="relative">
                <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input className="input pl-10" type="password"
                  placeholder={store.shopifyConnected ? "•••••••• (stored — enter to replace)" : "shpat_…"}
                  value={form.accessToken} onChange={setF("accessToken")} />
              </div>
            </div>
            <div>
              <label className="label">API version</label>
              <input className="input max-w-[180px]" value={form.apiVersion} onChange={setF("apiVersion")} placeholder="2026-10" />
              <p className="mt-1 text-xs text-ink-400">Latest stable Shopify Admin API (GraphQL).</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button className="btn-primary" onClick={save} disabled={busy}>
                {busy ? <Spinner size={16} /> : <Save size={16} />} Save connection
              </button>
              <button className="btn-outline" onClick={test} disabled={testing}>
                {testing ? <Spinner size={16} /> : <Plug size={16} />} Test connection
              </button>
              {store.shopifyConnected && (
                <button className="btn-danger ml-auto" onClick={disconnect}><Unplug size={16} /> Disconnect</button>
              )}
            </div>

            {shopInfo && (
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-700">
                <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> {shopInfo.shopName}</p>
                <p className="mt-0.5 text-accent-600/90">{shopInfo.shopDomain} · {shopInfo.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Help panel */}
        <div className="card h-fit bg-gradient-to-b from-brand-50 to-white p-6">
          <div className="mb-3 flex items-center gap-2 text-brand-700">
            <Info size={18} /> <h4 className="font-semibold">How to get a token</h4>
          </div>
          <ol className="space-y-3 text-sm leading-relaxed text-ink-600">
            <li className="flex gap-3">
              <Step n={1} />
              <span>In your Shopify admin, go to <b className="font-semibold text-ink-700">Settings → Apps and sales channels → Develop apps</b>.</span>
            </li>
            <li className="flex gap-3">
              <Step n={2} />
              <span>Create an app. Under <b className="font-semibold text-ink-700">Configuration</b>, grant the <b className="font-semibold text-ink-700">write_products</b> and <b className="font-semibold text-ink-700">write_inventory</b> scopes.</span>
            </li>
            <li className="flex gap-3">
              <Step n={3} />
              <span>Install the app, then copy the <b className="font-semibold text-ink-700">Admin API access token</b> (it starts with <code className="rounded bg-ink-100 px-1 text-xs">shpat_</code>).</span>
            </li>
            <li className="flex gap-3">
              <Step n={4} />
              <span>Paste the token above, along with your <code className="rounded bg-ink-100 px-1 text-xs">.myshopify.com</code> store domain, then click Save.</span>
            </li>
          </ol>
          <div className="mt-4 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-xs text-ink-500">
            Your token is encrypted at rest and never shown again after saving.
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ n }) {
  return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{n}</span>;
}
