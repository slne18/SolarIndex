"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { ensureProfileComplete } from "@/lib/ensure-profile-complete";
import { catalogAuthHeaders } from "@/lib/preview-catalog";
import { nf } from "@/lib/format";
import { VISION_COVERAGE_EQUIPE } from "@/lib/pv-overlap";
import type { PublicLead } from "@/lib/types";
import LeadFilters from "@/components/LeadFilters";
import LeadTable from "@/components/LeadTable";
import LeadsSolutionSection from "@/components/LeadsSolutionSection";
import LeadDemoFiche from "@/components/LeadDemoFiche";
import TerritoireClient from "@/components/TerritoireClient";
import FranceMap from "@/components/FranceMap";
import LeadsRecapTable from "@/components/LeadsRecapTable";
import CatalogViewToggle, { type CatalogView } from "@/components/CatalogViewToggle";
import { useTranslations } from "@/components/LocaleProvider";

function LeadsCatalog() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations();
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

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      await ensureProfileComplete("/leads", token);
    })();
  }, []);

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
        setError(data.error || t("leads.loadError"));
        setLeads([]);
        setTotal(0);
        return;
      }

      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setPage(data.page ?? 0);
    } catch {
      setError(t("onboarding.networkError"));
    } finally {
      setLoading(false);
    }
  }, [params, router, t]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (window.location.hash !== "#ma-zone") return;
    const t = window.setTimeout(() => {
      document.getElementById("ma-zone")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(t);
  }, []);

  function exploreCatalogFromZone(departement?: string) {
    const q = new URLSearchParams(params.toString());
    if (departement) q.set("departement", departement);
    else q.delete("departement");
    q.set("view", "list");
    q.delete("page");
    setView("list");
    router.push(`/leads?${q.toString()}`, { scroll: false });
    setTimeout(() => {
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }

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
            <p className="pill-accent w-fit">{t("leads.pill")}</p>
            <h1 className="section-title mt-4">{t("leads.title")}</h1>
          </div>

          <LeadsSolutionSection />
          <LeadDemoFiche />
        </div>
      </div>

      <div id="catalog" className="surface-light scroll-mt-24">
        <div className="container-x py-10 sm:py-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="catalog-heading text-xl font-bold">{t("leads.browseTitle")}</h2>
              <p className="mt-2 text-slate-600">
            {loading
              ? t("common.loading")
              : error
                ? error
                : (
                  <>
                    {nf(total)} {t("leads.opportunities")}
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
        <span className="font-semibold text-solar">{t("leads.guaranteeTitle")}</span>
        {" — "}
        {t("leads.guaranteeBody")}
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
            {t("leads.mapHint")}
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
              <p className="text-slate-600">{t("leads.loadingLeads")}</p>
            ) : (
              <LeadTable leads={leads} />
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {page > 0 ? (
                <Link href={mkHref(page - 1)} className="btn-ghost !py-2">{t("common.prev")}</Link>
              ) : (
                <span className="btn cursor-not-allowed opacity-40">{t("common.prev")}</span>
              )}
              <span className="text-sm text-slate-500">
                {t("common.page")} {page + 1} / {totalPages}
              </span>
              {page < totalPages - 1 ? (
                <Link href={mkHref(page + 1)} className="btn-ghost !py-2">{t("common.next")}</Link>
              ) : (
                <span className="btn cursor-not-allowed opacity-40">{t("common.next")}</span>
              )}
            </div>
          )}
        </>
      ) : null}
        </div>
      </div>

      <div className="hero-surface border-t border-white/[0.06]">
        <div className="container-x py-10 sm:py-12">
          <section id="ma-zone" className="scroll-mt-24">
            <p className="pill-accent w-fit">{t("leads.zonePill")}</p>
            <h2 className="section-title mt-4">{t("leads.zoneTitle")}</h2>
            <p className="mt-2 max-w-2xl text-slate-500">{t("leads.zoneLead")}</p>
            <div className="mt-6">
              <TerritoireClient embedded onExploreCatalog={exploreCatalogFromZone} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default function LeadsPageClient() {
  return (
    <Suspense fallback={<div className="container-x py-16 text-slate-400">…</div>}>
      <LeadsCatalog />
    </Suspense>
  );
}
