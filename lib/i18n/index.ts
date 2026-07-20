import en from "./locales/en";
import fr from "./locales/fr";
import type { MessageKey } from "./locales/fr";

export type Locale = "fr" | "en";

export const LOCALE_STORAGE_KEY = "solarindex-locale";
export const DEFAULT_LOCALE: Locale = "fr";

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { fr, en };

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function getMessages(locale: Locale): Record<MessageKey, string> {
  return MESSAGES[locale] ?? MESSAGES.fr;
}

export type { MessageKey };
