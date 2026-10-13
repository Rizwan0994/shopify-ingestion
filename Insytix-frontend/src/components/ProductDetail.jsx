import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Boxes, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Modal, Spinner, StatusBadge, SyncBadge, Badge } from "./ui";
import { money } from "../lib/format";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";

const REASON_LABEL = {
  no_image: "No product image",
  no_price: "No price set",
  out_of_stock: "Out of stock",
};

function optionSummary(v) {
  return [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(" / ") || "Default";
}

export default function ProductDetail({ productId, onClose, onChanged }) {
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hero, setHero] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!productId) { setProduct(null); return; }
    setLoading(true);
    api.get(`/products/${productId}`)
      .then((p) => { setProduct(p); setHero(p.images?.[0]?.src || null); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [productId]); // eslint-disable-line

  async function sync() {
    setSyncing(true);
    try {
      const r = await api.post(`/products/${productId}/sync`);
      toast.success(`Synced to Shopify as ${r.status}.`);
      if (r.inventoryWarning) toast.info("Product synced, but inventory could not be set.");
      const fresh = await api.get(`/products/${productId}`);
      setProduct(fresh);
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
      api.get(`/products/${productId}`).then(setProduct).catch(() => {});
    } finally {
      setSyncing(false);
    }
  }

  const open = !!productId;
  const reasons = product?.eligibility_reason || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={product?.title || "Product"}
      subtitle={product ? `${product.category || "Uncategorized"} · ${product.supplier_name}` : ""}
      footer={
        product && (
          <>
            <div className="mr-auto flex items-center gap-2 text-sm text-ink-500">
              {product.sync_status === "synced" && product.shopify_product_id && (
                <span className="flex items-center gap-1 text-brand-600">
                  <ExternalLink size={14} /> Shopify product #{product.shopify_product_id}
                </span>
              )}
            </div>
            <button className="btn-outline" onClick={onClose}>Close</button>
            <button className="btn-primary" onClick={sync} disabled={syncing}>
              {syncing ? <Spinner size={16} /> : <RefreshCw size={16} />}
              {product.sync_status === "synced" ? "Re-sync to Shopify" : "Sync to Shopify"}
            </button>
          </>
        )
      }
    >
      {loading || !product ? (
        <div className="grid place-items-center py-16"><Spinner size={26} className="text-brand-500" /></div>
      ) : (
        <div className="space-y-6">
          {/* Top: gallery + meta */}
          <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <div>
              <div className="aspect-square overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                {hero ? <img src={hero} alt="" className="h-full w-full object-cover" />
                  : <div className="grid h-full place-items-center text-ink-300"><ImageIcon size={40} /></div>}
              </div>
              {product.images.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {product.images.map((img) => (
                    <button key={img.id} onClick={() => setHero(img.src)}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${hero === img.src ? "border-brand-500 ring-2 ring-brand-200" : "border-ink-100"}`}>
                      <img src={img.src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={product.status} />
                <SyncBadge status={product.sync_status} />
                {!!product.is_bundle && <Badge className="bg-amber-500/10 text-amber-600"><Boxes size={13} /> Bundle</Badge>}
                {product.vendor && <Badge className="bg-ink-100 text-ink-600">{product.vendor}</Badge>}
              </div>

              {/* Eligibility */}
              {reasons.length ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>Will publish as <b>Draft</b> — {reasons.map((r) => REASON_LABEL[r] || r).join(", ")}.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-accent-500/30 bg-accent-500/10 px-3.5 py-2.5 text-sm text-accent-600">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span>Eligible — will publish to Shopify as <b>Active</b>.</span>
                </div>
              )}

              {product.sync_error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                  Last sync error: {product.sync_error}
                </div>
              )}

              {product.description && <p className="text-sm leading-relaxed text-ink-600">{product.description}</p>}
            </div>
          </div>

          {/* Variants */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Variants ({product.variants.length})</h4>
            <div className="overflow-hidden rounded-xl border border-ink-100">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">SKU</th>
                    <th className="px-3 py-2 font-semibold">Options</th>
                    <th className="px-3 py-2 text-right font-semibold">Price</th>
                    <th className="px-3 py-2 text-right font-semibold">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {product.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="px-3 py-2 font-mono text-xs text-ink-700">{v.sku}</td>
                      <td className="px-3 py-2 text-ink-600">{optionSummary(v)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold text-ink-900">{money(v.price)}</span>
                        {v.compare_at_price > v.price && <span className="ml-1.5 text-xs text-ink-400 line-through">{money(v.compare_at_price)}</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={v.quantity > 0 ? "text-ink-700" : "text-red-500"}>{v.quantity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bundle components */}
          {!!product.is_bundle && product.components.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Components included ({product.components.length})</h4>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100">
                {product.components.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <span className="text-ink-700">{c.component_title || c.component_sku}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-ink-500">{c.component_sku}</span>
                      <Badge className="bg-ink-100 text-ink-600">× {c.quantity}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
