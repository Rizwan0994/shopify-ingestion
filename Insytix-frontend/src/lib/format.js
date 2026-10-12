export function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function priceRange(min, max) {
  if (min === null || min === undefined) return "—";
  if (max === null || max === undefined || Number(min) === Number(max)) return money(min);
  return `${money(min)} – ${money(max)}`;
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function titleCase(s) {
  return String(s || "").replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}
