"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

const LOCALES: { code: Locale; flag: string; labelKey: "lang.fr" | "lang.en" }[] = [
  { code: "fr", flag: "🇫🇷", labelKey: "lang.fr" },
  { code: "en", flag: "🇬🇧", labelKey: "lang.en" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="language-switcher">
      <button
        type="button"
        className="language-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="language-switcher-flag" aria-hidden>
          {current.flag}
        </span>
        <span className="language-switcher-label">{t(current.labelKey)}</span>
        <svg
          className={`language-switcher-chevron ${open ? "language-switcher-chevron-open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <ul id={listId} className="language-switcher-menu" role="listbox" aria-label={t("nav.language")}>
          {LOCALES.map((item) => {
            const selected = item.code === locale;
            return (
              <li key={item.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`language-switcher-option ${selected ? "language-switcher-option-active" : ""}`}
                  onClick={() => pick(item.code)}
                >
                  <span className="language-switcher-flag" aria-hidden>
                    {item.flag}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
