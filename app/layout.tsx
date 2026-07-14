import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import HeaderAuthNav from "@/components/HeaderAuthNav";
import HeaderSignupCta from "@/components/HeaderSignupCta";
import SolarIndexIcon from "@/components/SolarIndexIcon";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SolarIndex — Leads parkings APER & appels d'offres solaires",
  description:
    "Deux produits : catalogue automatisé de parkings non conformes (loi APER) et marketplace d'appels d'offres déposés par les gérants.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

function Header() {
  return (
    <header className="site-header">
      <div className="header-bar">
        <Link href="/" className="header-brand group">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-solar to-solar-600 text-night shadow-glow transition group-hover:scale-[1.02] sm:h-11 sm:w-11">
            <SolarIndexIcon size={20} className="sm:h-[22px] sm:w-[22px]" />
          </span>
          <span className="header-brand-text whitespace-nowrap">
            Solar<span className="text-solar">Index</span>
          </span>
        </Link>
        <nav className="header-nav" aria-label="Navigation principale">
          <Link href="/leads" className="nav-link hidden sm:inline-flex">
            Leads auto
          </Link>
          <Link href="/appels-offres" className="nav-link hidden sm:inline-flex">
            Appels d&apos;offres
          </Link>
          <HeaderAuthNav />
          <HeaderSignupCta />
        </nav>
      </div>
    </header>
  );
}

function Footer({ light = false }: { light?: boolean }) {
  return (
    <footer className={light ? "footer-light" : "mt-20 border-t border-white/[0.08]"}>
      <div className="container-x grid gap-10 py-14 sm:grid-cols-3">
        <div>
          <div className={`flex items-center gap-2 font-bold ${light ? "footer-brand" : "text-white"}`}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-solar/90 text-night">
              <SolarIndexIcon size={14} />
            </span>
            Solar<span className="text-solar">Index</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
            Leads B2B pour installateurs solaires — pilotés par la contrainte réglementaire APER.
          </p>
        </div>
        <div className="text-sm">
          <div className={light ? "footer-heading font-semibold" : "font-semibold text-slate-200"}>Produits</div>
          <ul className="mt-4 space-y-2.5 text-slate-500">
            <li><Link href="/leads" className={light ? "footer-link" : "transition hover:text-white"}>Leads détectés</Link></li>
            <li><Link href="/appels-offres" className={light ? "footer-link" : "transition hover:text-white"}>Appels d&apos;offres</Link></li>
            <li><Link href="/#tarifs" className={light ? "footer-link" : "transition hover:text-white"}>Tarifs</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className={light ? "footer-heading font-semibold" : "font-semibold text-slate-200"}>Conformité</div>
          <p className="mt-4 leading-relaxed text-slate-500">
            OpenStreetMap · Etalab · SIRENE · MAJIC.
            Personnes morales uniquement — art. 6.1.f RGPD.
          </p>
        </div>
      </div>
      <div className={`py-6 text-center text-xs ${light ? "footer-copy border-t" : "border-t border-white/[0.06] text-slate-600"}`}>
        © {new Date().getFullYear()} SolarIndex
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";
  const isLightFooter =
    isHome || pathname.startsWith("/leads") || pathname.startsWith("/appels-offres");

  return (
    <html lang="fr" className={jakarta.variable}>
      <body className={`${jakarta.className} min-h-screen`}>
        <AnalyticsProvider>
          {!isAdmin && <Header />}
          <main>{children}</main>
          {!isAdmin && <Footer light={isLightFooter} />}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
