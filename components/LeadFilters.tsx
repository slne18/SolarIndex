"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
  "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
  "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
];

const SURFACES = [
  { v: "", l: "Toutes surfaces" },
  { v: "1500", l: "≥ 1 500 m²" },
  { v: "5000", l: "≥ 5 000 m²" },
  { v: "10000", l: "≥ 10 000 m²" },
  { v: "20000", l: "≥ 20 000 m²" },
];

const selectCls =
  "rounded-lg border border-white/15 bg-night-700/60 px-3 py-2 text-sm text-slate-100 focus:border-solar/60 focus:outline-none";

export default function LeadFilters({ lockedDepartement }: { lockedDepartement?: string | null }) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page"); // tout changement de filtre repart page 0
      router.replace(`/leads?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const activeDept = lockedDepartement ?? params.get("departement") ?? "";
  const [deptDraft, setDeptDraft] = useState(activeDept);

  useEffect(() => {
    setDeptDraft(activeDept);
  }, [activeDept]);

  const commitDepartement = useCallback(() => {
    if (lockedDepartement) return;
    const trimmed = deptDraft.trim();
    if (trimmed === (params.get("departement") ?? "")) return;
    update("departement", trimmed);
  }, [deptDraft, lockedDepartement, params, update]);

  return (
    <div className="card sticky top-16 z-30 flex flex-wrap items-center gap-3 p-4">
      <select
        className={selectCls}
        value={params.get("region") ?? ""}
        onChange={(e) => update("region", e.target.value)}
      >
        <option value="">Toutes régions</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <input
        className={`${selectCls} w-28 ${
          activeDept ? "border-red-500/70 bg-red-950/25 text-red-100 focus:border-red-500/80" : ""
        } ${lockedDepartement ? "cursor-not-allowed opacity-60" : ""}`}
        placeholder="Dépt (33)"
        value={deptDraft}
        readOnly={!!lockedDepartement}
        disabled={!!lockedDepartement}
        onChange={(e) => setDeptDraft(e.target.value)}
        onBlur={commitDepartement}
        onKeyDown={(e) => {
          if (!lockedDepartement && e.key === "Enter") {
            e.preventDefault();
            commitDepartement();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      <select
        className={selectCls}
        value={params.get("surface_min") ?? ""}
        onChange={(e) => update("surface_min", e.target.value)}
      >
        {SURFACES.map((s) => (
          <option key={s.v} value={s.v}>{s.l}</option>
        ))}
      </select>

      <select
        className={selectCls}
        value={params.get("flag") ?? ""}
        onChange={(e) => update("flag", e.target.value)}
      >
        <option value="">Tous les flags</option>
        <option value="URGENCE_ABSOLUE">Urgence absolue</option>
        <option value="CONFORME_REQUIS">À équiper</option>
      </select>

      <select
        className={selectCls}
        value={params.get("tier") ?? ""}
        onChange={(e) => update("tier", e.target.value)}
        title="Premium = signaux OSM + cadastre alignés, score ≥ 0,80"
      >
        <option value="">Tous les tiers</option>
        <option value="premium">Premium uniquement</option>
      </select>

      <select
        className={selectCls}
        value={params.get("fiabilite") ?? ""}
        onChange={(e) => update("fiabilite", e.target.value)}
        title="Détection de panneaux solaires existants"
      >
        <option value="">Fiabilité : tous</option>
        <option value="verifies">Sans doute PV (vérifiés)</option>
      </select>

      <input
        className={`${selectCls} w-32`}
        placeholder="Code NAF"
        defaultValue={params.get("naf") ?? ""}
        onBlur={(e) => update("naf", e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") update("naf", (e.target as HTMLInputElement).value.trim());
        }}
      />

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-slate-400">Trier :</span>
        <select
          className={selectCls}
          value={params.get("sort") ?? "valeur"}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="valeur">Valeur chantier ↓</option>
          <option value="surface">Surface ↓</option>
          <option value="date">Date d&apos;ajout ↓</option>
        </select>
      </div>
    </div>
  );
}
