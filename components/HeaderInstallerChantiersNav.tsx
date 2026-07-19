"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  INSTALLER_CHANTIERS_LINKS,
  isInstallerAppelsOffresPath,
} from "@/lib/installer-nav";

function isChantiersActive(pathname: string): boolean {
  return pathname.startsWith("/leads") || isInstallerAppelsOffresPath(pathname);
}

function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/appels-offres") return isInstallerAppelsOffresPath(pathname);
  return pathname.startsWith(href);
}

export default function HeaderInstallerChantiersNav() {
  const pathname = usePathname();
  const active = isChantiersActive(pathname);

  return (
    <div className="header-tools group relative">
      <button
        type="button"
        className={`nav-link header-product-link flex items-center gap-1 ${active ? "text-white" : ""}`}
        aria-haspopup="true"
        aria-expanded="false"
      >
        Chantiers
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
      <div className="header-tools-menu pointer-events-none absolute left-0 top-full z-50 min-w-[18rem] pt-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:min-w-[20rem]">
        <div className="rounded-xl border border-white/10 bg-night-900 py-2 shadow-xl">
          <p className="px-4 pb-2 text-xs leading-relaxed text-slate-500">
            Deux sources de chantiers pour votre prospection B2B.
          </p>
          {INSTALLER_CHANTIERS_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`header-tools-rich-link block px-4 py-2.5 transition hover:bg-white/[0.06] ${
                isLinkActive(pathname, item.href) ? "bg-white/[0.04]" : ""
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  isLinkActive(pathname, item.href) ? "text-solar" : "text-slate-100"
                }`}
              >
                {item.label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.hint}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
