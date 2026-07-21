"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "@/components/LocaleProvider";

export type EntrepriseSelection = {
  label: string;
  siren: string;
  siret: string;
};

type Props = {
  value: string;
  siren: string;
  siret: string;
  onChange: (selection: EntrepriseSelection) => void;
  required?: boolean;
  disabled?: boolean;
};

export default function EntrepriseAutocomplete({
  value,
  siren,
  siret,
  onChange,
  required,
  disabled,
}: Props) {
  const t = useTranslations();
  const listId = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<
    { label: string; siren: string; siret: string; ville: string }[]
  >([]);
  const debounceRef = useRef<number | null>(null);
  const blurRef = useRef<number | null>(null);
  /** Évite un nouveau fetch + réouverture juste après sélection dans la liste. */
  const pickedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (disabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (pickedQueryRef.current === trimmed) {
      pickedQueryRef.current = null;
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/entreprise/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json().catch(() => ({}));
        setItems(data.results ?? []);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, disabled]);

  function pick(item: { label: string; siren: string; siret: string; ville: string }) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (blurRef.current) window.clearTimeout(blurRef.current);
    pickedQueryRef.current = item.label.trim();
    setQuery(item.label);
    onChange({ label: item.label, siren: item.siren, siret: item.siret });
    setItems([]);
    setOpen(false);
    setLoading(false);
  }

  return (
    <div className="entreprise-autocomplete">
      <input
        type="text"
        required={required}
        disabled={disabled}
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="organization"
        className="input w-full"
        placeholder={t("onboarding.entrepriseSearchPlaceholder")}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onChange({ label: next, siren: "", siret: "" });
        }}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onBlur={() => {
          blurRef.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {siren ? (
        <p className="mt-1.5 text-xs text-slate-500">
          {t("onboarding.sirenLabel")} : <span className="text-slate-300">{siren}</span>
          {siret ? <span className="text-slate-500"> · SIRET {siret}</span> : null}
        </p>
      ) : null}
      {open && items.length > 0 ? (
        <ul id={listId} className="entreprise-autocomplete-list" role="listbox">
          {items.map((item) => (
            <li key={`${item.siren}-${item.siret}`}>
              <button
                type="button"
                role="option"
                className="entreprise-autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
              >
                <span className="font-medium text-slate-100">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  SIREN {item.siren}
                  {item.ville ? ` · ${item.ville}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? <p className="mt-1 text-xs text-slate-500">{t("common.loading")}</p> : null}
    </div>
  );
}
