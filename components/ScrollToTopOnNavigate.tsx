"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Remonte en haut à chaque changement de page (pas de query string seule). */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
