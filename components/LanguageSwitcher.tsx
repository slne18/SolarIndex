"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

const OPTIONS: Locale[] = ["fr", "en"];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="language-switcher" role="group" aria-label="Language">
      {OPTIONS.map((code) => (
        <button
          key={code}
          type="button"
          className={`language-switcher-btn ${locale === code ? "language-switcher-btn-active" : ""}`}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {t(code === "fr" ? "lang.fr" : "lang.en")}
        </button>
      ))}
    </div>
  );
}
