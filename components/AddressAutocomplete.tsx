"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "@/components/LocaleProvider";

type BanFeature = {
  properties: { label: string };
};

type Props = {
  value: string;
  onChange: (label: string) => void;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  placeholder?: string;
};

export default function AddressAutocomplete({
  value,
  onChange,
  required,
  disabled,
  name,
  placeholder,
}: Props) {
  const t = useTranslations();
  const listId = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BanFeature[]>([]);
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
    if (trimmed.length < 3) {
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
        const res = await fetch(`/api/verifier/ban?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json().catch(() => ({}));
        setItems(data.features ?? []);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, disabled]);

  function pick(label: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (blurRef.current) window.clearTimeout(blurRef.current);
    pickedQueryRef.current = label.trim();
    setQuery(label);
    onChange(label);
    setItems([]);
    setOpen(false);
    setLoading(false);
  }

  return (
    <div className="entreprise-autocomplete">
      <input
        type="text"
        name={name}
        required={required}
        disabled={disabled}
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="street-address"
        className="input w-full"
        placeholder={placeholder ?? t("territoire.addressPlaceholder")}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onChange(next);
        }}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onBlur={() => {
          blurRef.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && items.length > 0 ? (
        <ul id={listId} className="entreprise-autocomplete-list" role="listbox">
          {items.map((item, i) => (
            <li key={`${item.properties.label}-${i}`}>
              <button
                type="button"
                role="option"
                className="entreprise-autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item.properties.label);
                }}
              >
                <span className="font-medium text-slate-100">{item.properties.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? <p className="mt-1 text-xs text-slate-500">{t("common.loading")}</p> : null}
    </div>
  );
}
