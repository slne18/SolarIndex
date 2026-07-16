"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { catalogAuthHeaders } from "@/lib/preview-catalog";
import { nf } from "@/lib/format";
import { LEAD_REPLACEMENT_GUARANTEE } from "@/lib/guarantee";
import { VISION_COVERAGE_EQUIPE } from "@/lib/pv-overlap";
import type { PublicLead } from "@/lib/types";
import LeadFilters from "@/components/LeadFilters";
import LeadTable from "@/components/LeadTable";
import LeadsSolutionSection from "@/components/LeadsSolutionSection";
import LeadDemoFiche from "@/components/LeadDemoFiche";
import FranceMap from "@/components/FranceMap";
import LeadsRecapTable from "@/components/LeadsRecapTable";
import CatalogViewToggle, { type CatalogView } from "@/components/CatalogViewToggle";

function LeadsCatalog() {
  const router = useRouter();
  const params = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const [leads, setLeads] = useState<PublicLead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CatalogView>(
    params.get("view") === "list" ? "list" : "map",
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getAccessToken();

    const q = new URLSearchParams(params.toString());
    try {
      const res = await fetch(`/api/leads?${q.toString()}`, {
        headers: catalogAuthHeaders(token),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Impossible de charger le catalogue.");
        setLeads([]);
        setTotal(0);
        return;
      }

      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setPage(data.page ?? 0);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, [params, router]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const mkHref = (p: number) => {
    const q = new URLSearchParams(params.toString());
    q.set("page", String(p));
    return `/leads?${q.toString()}`;
  };

  function setCatalogView(next: CatalogView) {
    setView(next);
    const q = new URLSearchParams(params.toString());
    q.set("view", next);
    router.replace(`/leads?${q.toString()}`, { scroll: false });
  }

  function selectDepartement(code: string) {
    const q = new URLSearchParams(params.toString());
    q.set("departement", code);
    q.delete("page");
    q.set("view", "list");
    setView("list");
    router.push(`/leads?${q.toString()}`, { scroll: false });
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
  }

  const selectedDept = params.get("departement");

  return (
    <>
      <div className="hero-surface">
        <div className="container-x py-10 sm:py-12">
          <div className="mb-10">
            <p className="pill-accent w-fit">Leads automatisés</p>
            <h1 className="section-title mt-4">Catalogue de leads APER</h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Parkings repérés en ligne, enrichis cadastre & SIREN, scorés pour la prospection B2B.
            </p>
          </div>

          <LeadsSolutionSection />
          <LeadDemoFiche />
        </div>
      </div>

      <div className="surface-light">
        <div className="container-x py-10 sm:py-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="catalog-heading text-xl font-bold">Parcourir le catalogue</h2>
              <p className="mt-2 text-slate-600">
            {loading
              ? "Chargement…"
              : error
                ? error
                : (
                  <>
                    {nf(total)} opportunités APER
                    {params.get("flag") === "URGENCE_ABSOLUE" ? (
                      <span className="mt-1 block text-xs text-slate-500">
                        Parkings ≥ 10 000 m² · photo aérienne analysée · exclus si couverture &gt;{" "}
                        {VISION_COVERAGE_EQUIPE} %
                      </span>
                    ) : null}
                  </>
                )}
          </p>
        </div>
        <CatalogViewToggle view={view} onChange={setCatalogView} />
      </div>

      <p className="guarantee-banner mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed">
        <span className="font-semibold text-solar">Garantie non-négociable</span>
        {" — "}
        {LEAD_REPLACEMENT_GUARANTEE}
      </p>

      {view === "map" ? (
        <div className="card mt-6 p-6">
          <FranceMap
            statsUrl="/api/leads/stats-par-departement"
            selectedDepartement={selectedDept}
            onSelectDepartement={selectDepartement}
            showUrgences
            theme="light"
          />
          <p className="mt-4 text-center text-sm text-slate-500">
            Cliquez sur un département pour ouvrir la liste filtrée.
          </p>
          <LeadsRecapTable />
        </div>
      ) : null}

      {view === "list" ? (
        <>
          <div ref={listRef} className="mt-6">
            <LeadFilters />
          </div>

          <div className="mt-6">
            {loading ? (
              <p className="text-slate-600">Chargement des leads…</p>
            ) : (
              <LeadTable leads={leads} />
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {page > 0 ? (
                <Link href={mkHref(page - 1)} className="btn-ghost !py-2">← Précédent</Link>
              ) : (
                <span className="btn cursor-not-allowed opacity-40">← Précédent</span>
              )}
              <span className="text-sm text-slate-500">
                Page {page + 1} / {totalPages}
              </span>
              {page < totalPages - 1 ? (
                <Link href={mkHref(page + 1)} className="btn-ghost !py-2">Suivant →</Link>
              ) : (
                <span className="btn cursor-not-allowed opacity-40">Suivant →</span>
              )}
            </div>
          )}
        </>
      ) : null}
        </div>
      </div>
    </>
  );
}

export default function LeadsPageClient() {
  return (
    <Suspense fallback={<div className="container-x py-16 text-slate-400">Chargement…</div>}>
      <LeadsCatalog />
    </Suspense>
  );
}
