import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Truck, Settings, LogOut, Menu, X, Store, CheckCircle2 } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/settings", label: "Settings", icon: Settings },
];

const TITLES = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/suppliers": "Suppliers",
  "/settings": "Settings",
};

function SidebarContent({ onNavigate }) {
  const { user, tenant, logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-800 via-brand-900 to-ink-950">
      <div className="px-5 py-6">
        <Logo light />
        <p className="mt-2 pl-0.5 text-xs font-medium text-brand-200/70">Supplier → Shopify sync</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-bold text-white">
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{tenant?.storeName || "Workspace"}</p>
            <p className="truncate text-xs text-brand-200/70">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="nav-link mt-1 w-full">
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { tenant } = useAuth();
  const location = useLocation();
  const title = TITLES[location.pathname] || "Insytix";
  const connected = tenant?.shopifyConnected;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="fixed inset-y-0 w-[264px]">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[264px] animate-fade-in">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-200 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button className="btn-ghost h-9 w-9 !px-0 lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-ink-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <span className="badge bg-accent-500/10 text-accent-600">
                <CheckCircle2 size={14} /> {tenant.shopifyDomain}
              </span>
            ) : (
              <NavLink to="/settings" className="badge bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
                <Store size={14} /> Connect Shopify
              </NavLink>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
