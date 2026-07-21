"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderNavLinks from "@/components/HeaderNavLinks";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "@/components/LocaleProvider";
import { getBrowserClient, getAccessToken } from "@/lib/supabaseBrowser";
import { MON_ESPACE_PATH } from "@/lib/paths";

export default function MobileNavMenu() {
  const panelId = useId();
  const pathname = usePathname();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const supabase = getBrowserClient();

    (async () => {
      const token = await getAccessToken();
      setAuthed(!!token);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.access_token);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  function close() {
    setOpen(false);
  }

  return (
    <div className="mobile-nav lg:hidden">
      <button
        type="button"
        className="header-menu-btn"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <>
          <button type="button" className="mobile-nav-backdrop" aria-label={t("nav.closeMenu")} onClick={close} />
          <div id={panelId} className="mobile-nav-panel" role="dialog" aria-modal="true" aria-label={t("nav.menu")}>
            <HeaderNavLinks variant="drawer" onNavigate={close} />

            <div className="mobile-nav-section">
              <p className="mobile-nav-section-label">{t("nav.account")}</p>
              <div className="mobile-nav-links">
                {authed === null ? (
                  <span className="mobile-nav-link mobile-nav-link-muted" aria-hidden>
                    …
                  </span>
                ) : authed ? (
                  <Link href={MON_ESPACE_PATH} className="mobile-nav-link" onClick={close}>
                    {t("header.mySpace")}
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/login?next=${encodeURIComponent(MON_ESPACE_PATH)}`}
                      className="mobile-nav-link"
                      onClick={close}
                    >
                      {t("header.signIn")}
                    </Link>
                    <Link href="/login?mode=signup&next=/leads" className="btn-solar mobile-nav-cta" onClick={close}>
                      {t("header.createSpace")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="mobile-nav-section mobile-nav-section-lang">
              <p className="mobile-nav-section-label">{t("nav.language")}</p>
              <LanguageSwitcher />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
