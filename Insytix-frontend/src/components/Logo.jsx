export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <defs>
        <linearGradient id="insytix-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#insytix-g)" />
      <path d="M32 14 L50 23 L32 32 L14 23 Z" fill="#fff" fillOpacity="0.95" />
      <path d="M14 32 L32 41 L50 32" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 41 L32 50 L50 41" fill="none" stroke="#34d399" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 32, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-none">
        <div className={`text-[19px] font-extrabold tracking-tight ${light ? "text-white" : "text-ink-900"}`}>
          Insytix
        </div>
      </div>
    </div>
  );
}
