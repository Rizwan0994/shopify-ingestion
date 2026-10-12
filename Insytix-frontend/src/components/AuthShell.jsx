import { Logo } from "./Logo";
import { Boxes, RefreshCw, FolderInput, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: FolderInput, title: "Connect any supplier", text: "Import catalogs by CSV upload or a direct FTP feed." },
  { icon: Boxes, title: "Smart normalization", text: "Variants, bundles, images and categories handled automatically." },
  { icon: RefreshCw, title: "One-click Shopify sync", text: "Push eligible products straight to your storefront." },
];

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <Logo light size={38} />
        <div className="relative mt-auto">
          <h2 className="max-w-md text-4xl font-extrabold leading-tight text-white">
            Your suppliers and Shopify, finally in sync.
          </h2>
          <p className="mt-4 max-w-md text-brand-100/80">
            Insytix ingests supplier feeds, cleans them up, and publishes the right products to your store.
          </p>
          <div className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-brand-100/70">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-2 text-sm text-brand-100/60">
            <ShieldCheck size={16} /> Multi-tenant SaaS · tokens encrypted at rest
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center bg-ink-100 px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size={36} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
