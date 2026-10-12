import { useState } from "react";
import { FileUp, Server, CheckCircle2, Plug, Wand2 } from "lucide-react";
import { Modal, Spinner } from "./ui";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";

const EMPTY_FTP = { protocol: "ftp", host: "", port: "", username: "", password: "", remotePath: "" };

function MethodCard({ active, icon: Icon, title, text, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "border-ink-200 hover:border-ink-300"}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"}`}>
        <Icon size={20} />
      </span>
      <span>
        <span className="block font-semibold text-ink-900">{title}</span>
        <span className="block text-xs text-ink-500">{text}</span>
      </span>
    </button>
  );
}

export default function AddSupplierModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [method, setMethod] = useState("csv");
  const [name, setName] = useState("");
  const [ftp, setFtp] = useState(EMPTY_FTP);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState(null);

  const setF = (k) => (e) => { setFtp((p) => ({ ...p, [k]: e.target.value })); setTestOk(null); };

  function reset() {
    setMethod("csv"); setName(""); setFtp(EMPTY_FTP); setTestOk(null); setBusy(false); setTesting(false);
  }
  function close() { reset(); onClose(); }

  function fillDemo() {
    setFtp({ protocol: "ftp", host: "127.0.0.1", port: "2121", username: "insytix", password: "insytix123", remotePath: "/furniture-feed.csv" });
    if (!name) setName("Demo FTP Supplier");
    setTestOk(null);
  }

  async function test() {
    setTesting(true); setTestOk(null);
    try {
      const r = await api.post("/suppliers/test-connection", ftp);
      setTestOk(r.files || []);
      toast.success("Connection successful.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function submit() {
    if (!name.trim()) return toast.error("Give the supplier a name.");
    setBusy(true);
    try {
      const body = method === "csv" ? { name, method: "csv" } : { name, method: "ftp", ...ftp };
      const supplier = await api.post("/suppliers", body);
      toast.success(`${supplier.name} added.`);
      onCreated(supplier);
      close();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a supplier"
      subtitle="Choose how Insytix should receive this supplier's catalog."
      footer={
        <>
          <button className="btn-outline" onClick={close}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Spinner size={16} /> : <Plug size={16} />} Add supplier
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <MethodCard active={method === "csv"} icon={FileUp} title="CSV upload"
            text="Upload a spreadsheet feed from your computer." onClick={() => setMethod("csv")} />
          <MethodCard active={method === "ftp"} icon={Server} title="FTP / SFTP feed"
            text="Pull the feed file from a supplier's server." onClick={() => setMethod("ftp")} />
        </div>

        <div>
          <label className="label">Supplier name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aspen Wholesale" />
        </div>

        {method === "csv" ? (
          <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
            After adding, click <b>Upload feed</b> on the supplier card to import a CSV. Insytix detects columns,
            groups variants, builds bundles and keeps the supplier's own categories.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Connection details</label>
              <button type="button" onClick={fillDemo} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                <Wand2 size={13} /> Use demo FTP server
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="input" value={ftp.protocol} onChange={setF("protocol")}>
                <option value="ftp">FTP</option>
                <option value="ftps">FTPS</option>
                <option value="sftp">SFTP</option>
              </select>
              <input className="input sm:col-span-2" placeholder="Host (e.g. 127.0.0.1)" value={ftp.host} onChange={setF("host")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input className="input" placeholder="Port" value={ftp.port} onChange={setF("port")} />
              <input className="input" placeholder="Username" value={ftp.username} onChange={setF("username")} />
              <input className="input" type="password" placeholder="Password" value={ftp.password} onChange={setF("password")} />
            </div>
            <input className="input" placeholder="Remote file path (e.g. /furniture-feed.csv)" value={ftp.remotePath} onChange={setF("remotePath")} />

            <div className="flex items-center gap-3">
              <button type="button" className="btn-outline" onClick={test} disabled={testing || !ftp.host}>
                {testing ? <Spinner size={16} /> : <Plug size={16} />} Test connection
              </button>
              {testOk && (
                <span className="flex items-center gap-1.5 text-sm text-accent-600">
                  <CheckCircle2 size={16} /> Reached server · {testOk.length} file{testOk.length === 1 ? "" : "s"} visible
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
