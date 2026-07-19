"use client";

import { usePathname } from "next/navigation";
import NewsTickerBanner from "@/components/NewsTickerBanner";
import SiteHeader from "@/components/SiteHeader";
import { usePersona } from "@/components/PersonaProvider";

export default function SiteChrome() {
  const pathname = usePathname();
  const { persona, sessionPick, ready } = usePersona();
  const isHome = pathname === "/";
  const showHeaderTicker =
    isHome && ready && sessionPick && (persona === "installer" || persona === "owner");

  return (
    <div className="site-chrome">
      {showHeaderTicker ? <NewsTickerBanner /> : null}
      <SiteHeader />
    </div>
  );
}
