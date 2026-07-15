"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import RfpLegalNotice from "@/components/RfpLegalNotice";
import { nf } from "@/lib/format";
import { PRIX_RFP, type PublicRfp } from "@/lib/rfp";
import FranceMap from "@/components/FranceMap";
import CatalogViewToggle, { type CatalogView } from "@/components/CatalogViewToggle";
import RfpTable from "@/components/RfpTable";

function RfpFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const selectCls =
    "rounded-lg border border-white/15 bg-night-700/60 px-3 py-2 text-sm text-slate-100 focus:border-solar/60 focus:outline-none";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/appels-offres?${next.toString()}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <input
        className={`${selectCls} w-28`}
        placeholder="Dépt (33)"
        defaultValue={params.get("departement") ?? ""}
        onBlur={(e) => update("departement", e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") update("departement", (e.target as HTMLInputElement).value.trim());
        }}
      />
      <select
        className={selectCls}
        value={params.get("surface_min") ?? ""}
        onChange={(e) => update("surface_min", e.target.value)}
      >
        <option value="">Toutes surfaces</option>
        <option value="1500">≥ 1 500 m²</option>
        <option value="5000">≥ 5 000 m²</option>
        <option value="10000">≥ 10 000 m²</option>
      </select>
    </div>
  );
}

function AppelsOffresCatalog() {
  const router = useRouter();
  const params = useSearchParams();
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
    router.push(`/appels-offres?${q.toString()}`);
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
  }

  const mkHref = (p: number) => {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    return `/appels-offres?${q.toString()}`;
  };

  return (
    <div className="surface-light min-h-[50vh]">
      <div className="container-x py-10 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Consultation installateurs</h1>
          <p className="mt-2 text-slate-600">
            {loading ? "Chargement…" : `${nf(total)} projets déposés · ${PRIX_RFP.sous_10000}–${PRIX_RFP.a_partir_10000} € par accès`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mise en relation commerciale privée — hors marchés publics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/login?mode=signup&next=/appels-offres/nouveau" className="btn-solar !py-2">
            Déposer un projet
          </Link>
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
        {loading ? <p className="text-slate-600">Chargement…</p> : <RfpTable rfps={rfps} />}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 0 ? (
            <Link href={mkHref(page - 1)} className="btn-ghost !py-2">← Précédent</Link>
          ) : (
            <span className="btn cursor-not-allowed opacity-40">← Précédent</span>
          )}
          <span className="text-sm text-slate-500">Page {page + 1} / {totalPages}</span>
          {page < totalPages - 1 ? (
            <Link href={mkHref(page + 1)} className="btn-ghost !py-2">Suivant →</Link>
          ) : (
            <span className="btn cursor-not-allowed opacity-40">Suivant →</span>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default function AppelsOffresPageClient() {
  return (
    <Suspense fallback={<div className="container-x py-16 text-slate-400">Chargement…</div>}>
      <AppelsOffresCatalog />
    </Suspense>
  );
}
