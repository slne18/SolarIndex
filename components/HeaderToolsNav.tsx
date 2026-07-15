"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOLS = [
  { href: "/verifier", label: "Éligibilité APER" },
  { href: "/simulateur", label: "Gains & économies" },
  { href: "/observatoire", label: "Observatoire national" },
] as const;

export default function HeaderToolsNav() {
  const pathname = usePathname();
  const active = TOOLS.some((t) => pathname.startsWith(t.href));

  return (
    <div className="header-tools group relative hidden sm:block">
      <button
        type="button"
        className={`nav-link header-product-link flex items-center gap-1 ${active ? "text-white" : ""}`}
        aria-haspopup="true"
        aria-expanded="false"
      >
        Outils de vérification
        <svg
          className="h-3.5 w-3.5 opacity-60 transition group-hover:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="header-tools-menu pointer-events-none absolute left-0 top-full z-50 min-w-[15rem] pt-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <div className="rounded-xl border border-white/10 bg-night-900 py-1.5 shadow-xl">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`block px-4 py-2.5 text-sm transition hover:bg-white/[0.06] hover:text-white ${
                pathname.startsWith(tool.href) ? "text-solar" : "text-slate-300"
              }`}
            >
              {tool.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
