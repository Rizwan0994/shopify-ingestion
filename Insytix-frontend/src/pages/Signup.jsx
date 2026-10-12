import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, User, Mail, Lock, ArrowRight } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Signup() {
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ storeName: "", name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    try {
      await signup(form);
      toast.success("Workspace created — welcome to Insytix!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-ink-900">Create your workspace</h1>
        <p className="mt-1 text-sm text-ink-500">Start syncing suppliers to Shopify in minutes.</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label className="label">Store / company name</label>
            <div className="relative">
              <Store size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input className="input pl-10" required autoFocus value={form.storeName}
                onChange={set("storeName")} placeholder="Aspen Home Furnishings" />
            </div>
          </div>
          <div>
            <label className="label">Your name</label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input className="input pl-10" value={form.name} onChange={set("name")} placeholder="Jane Doe" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input className="input pl-10" type="email" required value={form.email}
                onChange={set("email")} placeholder="you@store.com" />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input className="input pl-10" type="password" required value={form.password}
                onChange={set("password")} placeholder="At least 8 characters" />
            </div>
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : <>Create workspace <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
