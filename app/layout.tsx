import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Sans, Syne } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import { PersonaProvider } from "@/components/PersonaProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import SiteChrome from "@/components/SiteChrome";
import SiteFooter from "@/components/SiteFooter";
import ScrollToTopOnNavigate from "@/components/ScrollToTopOnNavigate";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { SEO_DEFAULT_DESCRIPTION, SEO_KEYWORDS } from "@/lib/seo-config";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
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
    <html lang="fr" className={`${dmSans.variable} ${syne.variable}`}>
      <body className={`${dmSans.className} min-h-screen`}>
        <AnalyticsProvider>
          <LocaleProvider>
            <PersonaProvider>
              <ScrollToTopOnNavigate />
              {!isAdmin && (
                <div className="site-chrome">
                  <Header />
                </div>
              )}
              <main>{children}</main>
              {!isAdmin && <SiteFooter light={isLightFooter} />}
            </PersonaProvider>
          </LocaleProvider>
        </AnalyticsProvider>
        <Analytics />
      </body>
    </html>
  );
}
