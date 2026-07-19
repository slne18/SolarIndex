import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import { PersonaProvider } from "@/components/PersonaProvider";
import SiteChrome from "@/components/SiteChrome";
import SolarIndexIcon from "@/components/SolarIndexIcon";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { SEO_DEFAULT_DESCRIPTION, SEO_KEYWORDS } from "@/lib/seo-config";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SolarIndex — Leads parkings APER & appels d'offres solaires",
    template: "%s | SolarIndex",
  },
  description: SEO_DEFAULT_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "SolarIndex",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

function Header() {
  return <SiteChrome />;
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
            <li><Link href="/verifier" className={light ? "footer-link" : "transition hover:text-white"}>Vérifier éligibilité</Link></li>
            <li><Link href="/simulateur" className={light ? "footer-link" : "transition hover:text-white"}>Gains &amp; économies parking</Link></li>
            <li><Link href="/territoire" className={light ? "footer-link" : "transition hover:text-white"}>Calculateur territoire</Link></li>
            <li><Link href="/#tarifs" className={light ? "footer-link" : "transition hover:text-white"}>Tarifs</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className={light ? "footer-heading font-semibold" : "font-semibold text-slate-200"}>Légal</div>
          <ul className="mt-4 space-y-2.5 text-slate-500">
            <li>
              <Link href="/legal/confidentialite" className={light ? "footer-link" : "transition hover:text-white"}>
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/legal/mentions-legales" className={light ? "footer-link" : "transition hover:text-white"}>
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/legal/cgv" className={light ? "footer-link" : "transition hover:text-white"}>
                CGV
              </Link>
            </li>
            <li>
              <Link href="/faq" className={light ? "footer-link" : "transition hover:text-white"}>
                FAQ
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className={`py-6 text-center text-xs ${light ? "footer-copy border-t" : "border-t border-white/[0.06] text-slate-600"}`}>
        © {new Date().getFullYear()} SolarIndex · OpenStreetMap · Etalab · SIREN · MAJIC
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";
  const isLightFooter =
    isHome ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/appels-offres") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/faq");

  return (
    <html lang="fr" className={jakarta.variable}>
      <body className={`${jakarta.className} min-h-screen`}>
        <AnalyticsProvider>
          <PersonaProvider>
            {!isAdmin && (
              <div className="site-chrome">
                <Header />
              </div>
            )}
            <main>{children}</main>
            {!isAdmin && <Footer light={isLightFooter} />}
          </PersonaProvider>
        </AnalyticsProvider>
        <Analytics />
      </body>
    </html>
  );
}
