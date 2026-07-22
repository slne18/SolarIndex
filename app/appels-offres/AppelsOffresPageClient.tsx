"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import RfpLegalNotice from "@/components/RfpLegalNotice";
import { usePersona } from "@/components/PersonaProvider";
import { showOwnerProjectDeposit } from "@/lib/persona";
import { nf } from "@/lib/format";
import { PRIX_RFP, type PublicRfp } from "@/lib/rfp";
import FranceMap from "@/components/FranceMap";
import CatalogViewToggle, { type CatalogView } from "@/components/CatalogViewToggle";
import RfpTable from "@/components/RfpTable";
import { useTranslations } from "@/components/LocaleProvider";
import { SIMULATOR_REGIONS } from "@/lib/solar-simulator";
import { RFP_OWNER_TYPE_LABELS } from "@/lib/rfp-official";

function RfpFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations();
  const selectCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-solar focus:outline-none";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`/appels-offres?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${selectCls} w-28`}
          placeholder={t("rfp.filter.deptPlaceholder")}
          defaultValue={params.get("departement") ?? ""}
          onBlur={(e) => update("departement", e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("departement", (e.target as HTMLInputElement).value.trim());
          }}
        />
        <select
          className={selectCls}
          value={params.get("region") ?? ""}
          onChange={(e) => update("region", e.target.value)}
        >
          <option value="">{t("rfp.filter.allRegions")}</option>
          {SIMULATOR_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={params.get("surface_min") ?? ""}
          onChange={(e) => update("surface_min", e.target.value)}
        >
          <option value="">{t("rfp.filter.allSurfaces")}</option>
          <option value="1500">{t("rfp.filter.surface1500")}</option>
          <option value="5000">{t("rfp.filter.surface5000")}</option>
          <option value="10000">{t("rfp.filter.surface10000")}</option>
        </select>
        <select
          className={selectCls}
          value={params.get("places_min") ?? ""}
          onChange={(e) => update("places_min", e.target.value)}
        >
          <option value="">{t("rfp.filter.placesMin")}</option>
          <option value="50">{t("rfp.filter.places50")}</option>
          <option value="200">{t("rfp.filter.places200")}</option>
          <option value="500">{t("rfp.filter.places500")}</option>
        </select>
        <select
          className={selectCls}
          value={params.get("puissance_min") ?? ""}
          onChange={(e) => update("puissance_min", e.target.value)}
        >
          <option value="">{t("rfp.filter.powerMin")}</option>
          <option value="100">{t("rfp.filter.power100")}</option>
          <option value="500">{t("rfp.filter.power500")}</option>
          <option value="1000">{t("rfp.filter.power1000")}</option>
        </select>
        <select
          className={selectCls}
          value={params.get("ao_publie") ?? ""}
          onChange={(e) => update("ao_publie", e.target.value)}
        >
          <option value="">{t("rfp.filter.aoAll")}</option>
          <option value="1">{t("rfp.filter.aoPublished")}</option>
          <option value="0">{t("rfp.filter.aoNone")}</option>
        </select>
        <select
          className={selectCls}
          value={params.get("parking_etudie") ?? ""}
          onChange={(e) => update("parking_etudie", e.target.value)}
        >
          <option value="">{t("rfp.filter.studyAll")}</option>
          <option value="1">{t("rfp.filter.studyDone")}</option>
          <option value="0">{t("rfp.filter.studyNotDone")}</option>
        </select>
        <select
          className={selectCls}
          value={params.get("aper_eligible") ?? ""}
          onChange={(e) => update("aper_eligible", e.target.value)}
        >
          <option value="">{t("rfp.filter.aperAll")}</option>
          <option value="1">{t("rfp.filter.aperEligible")}</option>
          <option value="0">{t("rfp.filter.aperBelow")}</option>
        </select>
        <select
          className={selectCls}
          value={params.get("type_proprietaire") ?? ""}
          onChange={(e) => update("type_proprietaire", e.target.value)}
        >
          <option value="">{t("rfp.filter.ownerType")}</option>
          {Object.entries(RFP_OWNER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={params.get("solution_paysagiste") ?? ""}
          onChange={(e) => update("solution_paysagiste", e.target.value)}
        >
          <option value="">{t("rfp.filter.solutionAll")}</option>
          <option value="1">{t("rfp.filter.solutionLandscaper")}</option>
        </select>
      </div>
    </div>
  );
}

function AppelsOffresCatalog() {
  const router = useRouter();
  const params = useSearchParams();
  const { persona, ready } = usePersona();
  const t = useTranslations();
  const isOwnerView = ready && persona === "owner";
  const showDepositCta = !ready || showOwnerProjectDeposit(persona);
  const listRef = useRef<HTMLDivElement>(null);
  const [rfps, setRfps] = useState<PublicRfp[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CatalogView>(
    params.get("view") === "list" ? "list" : "map",
  );

  const fetchRfps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rfp?${params.toString()}`);
      const data = await res.json();
      setRfps(data.rfps ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setPage(data.page ?? 0);
    } catch {
      setRfps([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchRfps();
  }, [fetchRfps]);

  function setCatalogView(next: CatalogView) {
    setView(next);
    const q = new URLSearchParams(params.toString());
    q.set("view", next);
    router.replace(`/appels-offres?${q.toString()}`, { scroll: false });
  }

  function selectDepartement(code: string) {
    const q = new URLSearchParams(params.toString());
    q.set("departement", code);
    q.delete("page");
    q.set("view", "list");
    setView("list");
    router.push(`/appels-offres?${q.toString()}`, { scroll: false });
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
  }

  const mkHref = (p: number) => {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    return `/appels-offres?${q.toString()}`;
  };

  const subtitle = loading
    ? t("common.loading")
    : isOwnerView
      ? `${nf(total)} ${t("rfp.subtitleOwner")}`
      : `${nf(total)} — ${PRIX_RFP.sous_10000}–${PRIX_RFP.a_partir_10000} €`;

  return (
    <div className="surface-light min-h-[50vh]">
      <div className="container-x py-10 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">
            {isOwnerView ? t("rfp.titleOwner") : t("rfp.titleInstaller")}
          </h1>
          <p className="mt-2 text-slate-600">{subtitle}</p>
          <p className="mt-1 text-xs text-slate-500">
            {isOwnerView ? t("rfp.hintOwner") : t("rfp.hintInstaller")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showDepositCta ? (
            <Link
              href="/login?mode=signup&next=/appels-offres/nouveau"
              className={`${isOwnerView ? "btn-mint" : "btn-solar"} !py-2`}
            >
              {t("rfp.depositProject")}
            </Link>
          ) : null}
          <CatalogViewToggle view={view} onChange={setCatalogView} />
        </div>
      </div>

      <div className="mb-6">
        <RfpLegalNotice variant="catalog" />
      </div>

      {view === "map" ? (
        <div className="card mb-6 p-6">
          <FranceMap
            statsUrl="/api/rfp/stats-par-departement"
            selectedDepartement={params.get("departement")}
            onSelectDepartement={selectDepartement}
            showUrgences={false}
            theme="light"
          />
        </div>
      ) : null}

      <div ref={listRef}>
        <RfpFilters />
      </div>

      <div className="mt-6">
        {loading ? <p className="text-slate-600">{t("common.loading")}</p> : <RfpTable rfps={rfps} />}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 0 ? (
            <Link href={mkHref(page - 1)} className="btn-ghost !py-2">{t("common.prev")}</Link>
          ) : (
            <span className="btn cursor-not-allowed opacity-40">{t("common.prev")}</span>
          )}
          <span className="text-sm text-slate-500">{t("common.page")} {page + 1} / {totalPages}</span>
          {page < totalPages - 1 ? (
            <Link href={mkHref(page + 1)} className="btn-ghost !py-2">{t("common.next")}</Link>
          ) : (
            <span className="btn cursor-not-allowed opacity-40">{t("common.next")}</span>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default function AppelsOffresPageClient() {
  return (
    <Suspense fallback={<div className="container-x py-16 text-slate-400">{/* locale in child */}…</div>}>
      <AppelsOffresCatalog />
    </Suspense>
  );
}
