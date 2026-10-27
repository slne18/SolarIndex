"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { euros, eurosCompact, formatCoords, nf, openStreetMapUrl } from "@/lib/format";
import { fmt } from "@/lib/i18n/format";
import { tierLabelKey } from "@/lib/i18n/leads-labels";
import { useTranslations } from "@/components/LocaleProvider";
import type { LeadRow, PublicLead } from "@/lib/types";
import SolarSimulator from "@/components/SolarSimulator";
import PayButton from "@/components/PayButton";
import CatalogUnlockedBadge from "@/components/CatalogUnlockedBadge";
import { FlagBadge } from "@/components/LeadTable";
import LeadTierBadge from "@/components/LeadTierBadge";
import { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
import LeadConfidencePanel from "@/components/LeadConfidencePanel";
import { catalogAuthHeaders } from "@/lib/preview-catalog";
import { isLeadSlotOpen } from "@/lib/lead-slots";
import { formatAperAnnualFine } from "@/lib/aper-fine";
import { useSolarAnalytics, trackLeadView } from "@/lib/analytics";
import { MON_ESPACE_PATH } from "@/lib/paths";
import { readLeadsCatalogReturn } from "@/lib/leads-catalog-return";

type DetailLead = PublicLead & Partial<LeadRow>;

function MaskedRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="select-none rounded bg-slate-200 px-8 py-1 text-xs font-medium text-slate-400">
        ••••••
      </span>
    </div>
  );
}

function LeadDetailContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const fromMonEspace = searchParams.get("from") === "mon-espace";
  const plausible = useSolarAnalytics();
  const [lead, setLead] = useState<DetailLead | null>(null);
  const [isOwned, setIsOwned] = useState(false);
  const [canPurchase, setCanPurchase] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogBackHref, setCatalogBackHref] = useState("/leads?view=list");

  useEffect(() => {
    setCatalogBackHref(readLeadsCatalogReturn());
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      setAuthed(!!token);
      try {
        const res = await fetch(`/api/leads/${id}`, {
          headers: catalogAuthHeaders(token),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || t("leads.detail.notFound"));
          return;
        }
        setLead(data.lead);
        setIsOwned(!!data.is_owned);
        setCanPurchase(!!data.can_purchase);
      } catch {
        setError(t("onboarding.networkError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, t]);

  useEffect(() => {
    if (!lead) return;
    trackLeadView(plausible, {
      tier: lead.tier,
      departement: lead.departement,
      flag: lead.flag_urgence,
    });
  }, [lead, plausible]);

  if (loading) {
    return (
      <div className="surface-light min-h-[50vh]">
        <p className="container-x py-10 text-slate-600">{t("leads.detail.loading")}</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="surface-light min-h-[50vh]">
        <div className="container-x py-10">
          <p className="text-red-600">{error || t("leads.detail.notFound")}</p>
          <Link href="/leads" className="back-link mt-4 inline-block text-sm underline">
            {t("leads.detail.backCatalog")}
          </Link>
        </div>
      </div>
    );
  }

  const displayPrix = lead.prix_lead;
  const slotOpen = isLeadSlotOpen({ statut: lead.statut });
  const displayName = lead.raison_sociale || lead.nom_osm || t("leads.detail.nonCompliantParking");
  const gpsCoords = formatCoords(lead.latitude, lead.longitude);
  const backHref = isOwned || fromMonEspace ? MON_ESPACE_PATH : catalogBackHref;
  const backLabel = isOwned || fromMonEspace ? t("leads.detail.backSpace") : t("leads.detail.allLeads");
  return (
    <div className="surface-light min-h-[50vh]">
    <div className="container-x lead-detail-page py-10">
      <Link href={backHref} className="back-link text-sm">
        {backLabel}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <FlagBadge flag={lead.flag_urgence} />
            <LeadTierBadge tier={lead.tier} />
            {lead.has_dirigeant ? <LeadDirigeantBadge /> : null}
          </div>

          <p className="mt-3 text-sm text-slate-600">{t("leads.detail.intro")}</p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{displayName}</h1>
          {lead.nom_osm && lead.raison_sociale && lead.nom_osm !== lead.raison_sociale ? (
            <p className="mt-1 text-sm text-slate-500">
              {t("leads.detail.siteOsm")} {lead.nom_osm}
            </p>
          ) : null}
          <p className="mt-1 text-slate-600">
            {lead.ville || t("leads.detail.location")} · {lead.region ?? ""} ({lead.departement})
          </p>

          <div className="card mt-6 grid grid-cols-2 gap-px overflow-hidden bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label={t("leads.detail.factSurface")} value={`${nf(lead.surface_m2)} m²`} />
            <Fact label={t("leads.detail.factSolar")} value={`${nf(lead.surface_solaire_m2)} m²`} />
            <Fact label={t("leads.detail.factPower")} value={`${nf(lead.puissance_kwc)} kWc`} />
            <Fact
              label={t("leads.detail.factProjectValue")}
              value={eurosCompact(lead.valeur_chantier_eur)}
              highlight
            />
          </div>

          <h2 className="mt-10 text-lg font-semibold text-slate-900">{t("leads.detail.simulatorTitle")}</h2>
          <p className="mb-3 text-sm text-slate-600">{t("leads.detail.simulatorLead")}</p>
          <SolarSimulator surfaceFromLead={Math.round(lead.surface_m2)} locked />

          <div className="mt-10">
            <LeadConfidencePanel lead={lead} />
          </div>

          {(lead.derogation_pente || lead.derogation_abf) && (
            <div className="card mt-4 border-amber-200 bg-amber-50 p-5 text-sm text-slate-700">
              <div className="font-semibold text-amber-800">{t("leads.detail.derogTitle")}</div>
              {lead.derogation_pente && (
                <p className="mt-2">
                  ⚠️{" "}
                  {fmt(t("leads.detail.derogPente"), {
                    pct:
                      typeof lead.pente_pct === "number" ? ` : ${lead.pente_pct}\u00a0%` : "",
                  })}
                </p>
              )}
              {lead.derogation_abf && (
                <p className="mt-2">⚠️ {t("leads.detail.derogAbf")}</p>
              )}
            </div>
          )}
        </div>

        <aside className="page-aside-sticky space-y-4">
          <div className="card p-6">
            {!isOwned ? (
              <>
                <div className="text-sm text-slate-600">
                  {fmt(t("leads.detail.priceLead"), { tier: t(tierLabelKey(lead.tier)) })}
                </div>
                <div className="mt-1 text-3xl font-bold text-solar">{`${lead.prix_lead} €`}</div>

                {canPurchase ? (
                  <div className="mt-4">
                    {!slotOpen ? (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                        {t("leads.badge.unavailableTitle")}
                      </p>
                    ) : (
                      <PayButton leadId={lead.id} prix={displayPrix} tier={lead.tier} />
                    )}
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    {!authed ? (
                      <>
                        {t("leads.detail.signInToPurchase")}{" "}
                        <Link
                          href={`/login?mode=signup&next=${encodeURIComponent(`/leads/${id}`)}`}
                          className="text-solar-700 underline"
                        >
                          {t("leads.detail.createSpaceLink")}
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        {t("leads.detail.purchaseInstallerOnly")}{" "}
                        <Link href="/appels-offres/nouveau" className="text-solar-700 underline">
                          {t("leads.detail.depositProjectLink")}
                        </Link>
                        .
                      </>
                    )}
                  </p>
                )}

                {canPurchase ? (
                  <p className="mt-3 text-center text-xs text-slate-500">
                    {t("leads.detail.checkoutHint")}
                  </p>
                ) : null}

                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h2 className="text-lg font-semibold text-slate-900">{t("leads.detail.whatYouBuy")}</h2>
                  <p className="mt-2 text-sm text-slate-600">{t("leads.detail.whatYouBuyDesc")}</p>
                  <div className="mt-4 space-y-1">
                    <MaskedRow label={t("leads.detail.contactOperator")} />
                    <MaskedRow label={t("leads.detail.contactSiren")} />
                    <MaskedRow label={t("leads.detail.contactDirectorOp")} />
                    <MaskedRow label={t("leads.detail.contactOwner")} />
                    <MaskedRow label={t("leads.detail.contactDirectorOwner")} />
                    <MaskedRow label={t("leads.detail.contactAddress")} />
                    <MaskedRow label={t("leads.detail.contactParcel")} />
                    <MaskedRow label={t("leads.detail.contactGps")} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50/80 p-4 text-center text-sm text-slate-700">
                  <CatalogUnlockedBadge />
                  <p>
                    {t("leads.detail.purchased")}{" "}
                    <Link href={MON_ESPACE_PATH} className="text-solar-700 underline">
                      {t("leads.detail.mySpace")}
                    </Link>
                    .
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h2 className="text-lg font-semibold text-slate-900">{t("leads.detail.contactsUnlocked")}</h2>
                  <p className="mt-2 text-sm text-slate-600">{t("leads.detail.contactsUnlockedDesc")}</p>
                  <div className="mt-4">
                    <ContactRow label={t("leads.detail.contactOperator")} value={lead.raison_sociale} />
                    <ContactRow label={t("leads.detail.contactSiren")} value={lead.siren} />
                    <ContactRow
                      label={t("leads.detail.contactDirectorOp")}
                      value={formatDirigeant(
                        lead.dirigeant_exploitant ?? lead.dirigeant_nom,
                        lead.dirigeant_exploitant_qualite,
                      )}
                    />
                    <ContactRow label={t("leads.detail.contactOwner")} value={lead.proprietaire_foncier} />
                    <ContactRow
                      label={t("leads.detail.contactDirectorOwner")}
                      value={formatDirigeant(
                        lead.dirigeant_proprietaire,
                        lead.dirigeant_proprietaire_qualite,
                      )}
                    />
                    <ContactRow label={t("leads.detail.contactAddress")} value={lead.adresse} />
                    <ContactRow label={t("leads.detail.contactParcel")} value={lead.id_parcelle} />
                    <ContactRow label={t("leads.detail.contactGps")} value={gpsCoords} />
                    {gpsCoords && lead.latitude != null && lead.longitude != null ? (
                      <div className="border-b border-slate-100 py-2.5 text-right text-sm">
                        <a
                          href={openStreetMapUrl(lead.latitude, lead.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-solar underline"
                        >
                          {t("leads.detail.viewOsm")}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="card p-5 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{t("leads.detail.whyLead")}</div>
            <p className="mt-2">
              {fmt(t("leads.detail.whyLeadBody"), {
                fine: formatAperAnnualFine(lead.surface_m2),
                value: euros(lead.valeur_chantier_eur),
              })}
            </p>
          </div>
        </aside>
      </div>
    </div>
    </div>
  );
}

function LeadDetailLoading() {
  const t = useTranslations();
  return (
    <div className="surface-light min-h-[50vh]">
      <p className="container-x py-10 text-slate-600">{t("leads.detail.loading")}</p>
    </div>
  );
}

export default function LeadDetailClient({ id }: { id: string }) {
  return (
    <Suspense fallback={<LeadDetailLoading />}>
      <LeadDetailContent id={id} />
    </Suspense>
  );
}

function ContactRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value?.trim() || "—"}</span>
    </div>
  );
}

function formatDirigeant(name: string | null | undefined, qualite: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  if (qualite?.trim()) return `${name.trim()} · ${qualite.trim()}`;
  return name.trim();
}

function Fact({
  label,
  value,
  highlight = false,
  title,
  subtitle,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className={`bg-white p-4 ${highlight ? "bg-amber-50" : ""}`} title={title}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${highlight ? "text-solar" : "text-slate-900"}`}>{value}</div>
      {subtitle ? <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div> : null}
    </div>
  );
}
