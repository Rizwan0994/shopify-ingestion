import { useEffect, useRef, useState } from "react";
import {
  Plus, FileUp, Server, DownloadCloud, Plug, History, Trash2, Boxes, Truck, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import api from "../lib/api";
import { PageLoader, EmptyState, Badge, StatusBadge, Spinner, Modal } from "../components/ui";
import { timeAgo } from "../lib/format";
import { useToast } from "../context/ToastContext";
import AddSupplierModal from "../components/AddSupplierModal";

function MethodBadge({ method }) {
  return method === "ftp"
    ? <Badge className="bg-blue-500/10 text-blue-600"><Server size={12} /> FTP</Badge>
    : <Badge className="bg-brand-500/10 text-brand-600"><FileUp size={12} /> CSV</Badge>;
}

export default function Suppliers() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [runsFor, setRunsFor] = useState(null);
  const fileRef = useRef(null);
  const uploadForRef = useRef(null);

  function load() {
    api.get("/suppliers").then(setSuppliers).catch((e) => toast.error(e.message));
  }
  useEffect(load, []); // eslint-disable-line

  function triggerUpload(id) {
    uploadForRef.current = id;
    fileRef.current.value = "";
    fileRef.current.click();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    const id = uploadForRef.current;
    if (!file || !id) return;
    setBusyId(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post(`/suppliers/${id}/upload`, fd);
      const s = r.summary;
      toast.success(`Imported ${s.products} products (${s.created} new, ${s.updated} updated).`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function fetchFtp(id) {
    setBusyId(id);
    try {
      const r = await api.post(`/suppliers/${id}/fetch`);
      const s = r.summary;
      toast.success(`Fetched & imported ${s.products} products from FTP.`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function testFtp(id) {
    setBusyId(id);
    try {
      const r = await api.post(`/suppliers/${id}/test`);
      toast.success(`Connection OK — ${r.files?.length || 0} file(s) visible.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete "${s.name}" and all its imported products?`)) return;
    try {
      await api.delete(`/suppliers/${s.id}`);
      toast.success(`${s.name} removed.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!suppliers) return <PageLoader label="Loading suppliers…" />;

  return (
    <div className="space-y-5">
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={onFile} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} connected
        </p>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add supplier</button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="No suppliers yet"
          action={<button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add your first supplier</button>}>
          Connect a supplier by uploading a CSV feed or pulling one from an FTP server.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {suppliers.map((s) => {
            const busy = busyId === s.id;
            return (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                      <Truck size={20} />
                    </span>
                    <div>
                      <p className="font-semibold text-ink-900">{s.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <MethodBadge method={s.method} />
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  </div>
                  <button className="btn-ghost h-8 w-8 !px-0 text-ink-400 hover:text-red-600" onClick={() => remove(s)} title="Delete supplier">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-ink-50 px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs text-ink-500"><Boxes size={13} /> Products</p>
                    <p className="mt-0.5 text-lg font-bold text-ink-900">{s.productCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-ink-50 px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs text-ink-500"><Clock size={13} /> Last import</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-800">{s.lastIngestAt ? timeAgo(s.lastIngestAt) : "Never"}</p>
                  </div>
                </div>

                {s.method === "ftp" && s.ftp && (
                  <p className="mt-3 truncate font-mono text-xs text-ink-500">
                    {s.ftp.protocol}://{s.ftp.host}:{s.ftp.port}{s.ftp.remotePath}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {s.method === "csv" ? (
                    <button className="btn-primary" disabled={busy} onClick={() => triggerUpload(s.id)}>
                      {busy ? <Spinner size={16} /> : <FileUp size={16} />} Upload feed
                    </button>
                  ) : (
                    <>
                      <button className="btn-primary" disabled={busy} onClick={() => fetchFtp(s.id)}>
                        {busy ? <Spinner size={16} /> : <DownloadCloud size={16} />} Fetch now
                      </button>
                      <button className="btn-outline" disabled={busy} onClick={() => testFtp(s.id)}>
                        <Plug size={16} /> Test
                      </button>
                    </>
                  )}
                  <button className="btn-ghost" onClick={() => setRunsFor(s)}><History size={16} /> History</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddSupplierModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
      <RunsModal supplier={runsFor} onClose={() => setRunsFor(null)} />
    </div>
  );
}

function RunsModal({ supplier, onClose }) {
  const [runs, setRuns] = useState(null);
  useEffect(() => {
    if (!supplier) { setRuns(null); return; }
    api.get(`/suppliers/${supplier.id}/runs`).then(setRuns).catch(() => setRuns([]));
  }, [supplier]);

  return (
    <Modal open={!!supplier} onClose={onClose} title="Import history" subtitle={supplier?.name}>
      {!runs ? (
        <div className="grid place-items-center py-10"><Spinner size={24} className="text-brand-500" /></div>
      ) : runs.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500">No imports yet for this supplier.</p>
      ) : (
        <ul className="space-y-2.5">
          {runs.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-xl border border-ink-100 p-3">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${r.status === "success" ? "bg-accent-500/10 text-accent-600" : "bg-red-500/10 text-red-600"}`}>
                {r.status === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-800">{r.message || r.status}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {r.method?.toUpperCase()} · {r.source || "—"} · {timeAgo(r.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
