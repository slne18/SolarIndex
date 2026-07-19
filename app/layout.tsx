import type { Metadata } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import { PersonaProvider } from "@/components/PersonaProvider";
import SiteChrome from "@/components/SiteChrome";
import SiteFooter from "@/components/SiteFooter";
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
            {!isAdmin && <SiteFooter light={isLightFooter} />}
          </PersonaProvider>
        </AnalyticsProvider>
        <Analytics />
      </body>
    </html>
  );
}
