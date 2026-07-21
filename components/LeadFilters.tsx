"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/components/LocaleProvider";

const REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
  "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
  "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
];

const selectCls =
  "rounded-lg border border-white/15 bg-night-700/60 px-3 py-2 text-sm text-slate-100 focus:border-solar/60 focus:outline-none";

export default function LeadFilters({ lockedDepartement }: { lockedDepartement?: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations();

  const surfaces = useMemo(
    () => [
      { v: "", l: t("leads.filter.allSurfaces") },
      { v: "1500", l: t("leads.filter.surface1500") },
      { v: "5000", l: t("leads.filter.surface5000") },
      { v: "10000", l: t("leads.filter.surface10000") },
      { v: "20000", l: t("leads.filter.surface20000") },
    ],
    [t],
  );

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      router.replace(`/leads?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    const view = params.get("view");
    if (view) next.set("view", view);
    router.replace(`/leads?${next.toString()}`, { scroll: false });
  }, [params, router]);

  const activeDept = lockedDepartement ?? params.get("departement") ?? "";
  const [deptDraft, setDeptDraft] = useState(activeDept);
  const hasActiveFilters =
    !!params.get("region") ||
    !!params.get("departement") ||
    !!params.get("surface_min") ||
    !!params.get("flag") ||
    !!params.get("tier") ||
    !!params.get("fiabilite") ||
    !!params.get("naf") ||
    params.get("dirigeant") === "1" ||
    (params.get("sort") && params.get("sort") !== "valeur");

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
        <option value="">{t("leads.filter.allRegions")}</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <input
        className={`${selectCls} w-28 ${
          activeDept ? "border-red-500/70 bg-red-950/25 text-red-100 focus:border-red-500/80" : ""
        } ${lockedDepartement ? "cursor-not-allowed opacity-60" : ""}`}
        placeholder={t("leads.filter.deptPlaceholder")}
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
        {surfaces.map((s) => (
          <option key={s.v} value={s.v}>{s.l}</option>
        ))}
      </select>

      <select
        className={selectCls}
        value={params.get("flag") ?? ""}
        onChange={(e) => update("flag", e.target.value)}
      >
        <option value="">{t("leads.filter.allFlags")}</option>
        <option value="URGENCE_ABSOLUE">{t("leads.filter.urgence")}</option>
        <option value="CONFORME_REQUIS">{t("leads.filter.toEquip")}</option>
      </select>

      <select
        className={selectCls}
        value={params.get("tier") ?? ""}
        onChange={(e) => update("tier", e.target.value)}
        title={t("leads.filter.premiumTitle")}
      >
        <option value="">{t("leads.filter.allTiers")}</option>
        <option value="premium">{t("leads.filter.premiumOnly")}</option>
      </select>

      <select
        className={selectCls}
        value={params.get("dirigeant") ?? ""}
        onChange={(e) => update("dirigeant", e.target.value === "1" ? "1" : "")}
        title={t("leads.filter.directorTitle")}
      >
        <option value="">{t("leads.filter.directorAll")}</option>
        <option value="1">{t("leads.filter.directorIdentified")}</option>
      </select>

      <select
        className={selectCls}
        value={params.get("fiabilite") ?? ""}
        onChange={(e) => update("fiabilite", e.target.value)}
        title={t("leads.filter.reliabilityTitle")}
      >
        <option value="">{t("leads.filter.reliabilityAll")}</option>
        <option value="verifies">{t("leads.filter.reliabilityVerified")}</option>
      </select>

      <input
        className={`${selectCls} w-32`}
        placeholder={t("leads.filter.nafPlaceholder")}
        defaultValue={params.get("naf") ?? ""}
        onBlur={(e) => update("naf", e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") update("naf", (e.target as HTMLInputElement).value.trim());
        }}
      />

      {hasActiveFilters ? (
        <button type="button" onClick={clearAll} className="btn-ghost !py-2 text-xs">
          {t("leads.filter.clear")}
        </button>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-slate-400">{t("leads.filter.sort")}</span>
        <select
          className={selectCls}
          value={params.get("sort") ?? "valeur"}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="valeur">{t("leads.filter.sortValue")}</option>
          <option value="surface">{t("leads.filter.sortSurface")}</option>
          <option value="date">{t("leads.filter.sortDate")}</option>
        </select>
      </div>
    </div>
  );
}
