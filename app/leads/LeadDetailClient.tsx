"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { euros, eurosCompact, nf, scoreLabel } from "@/lib/format";
import {
  displayRecouvrementSourceLine,
  displayRecouvrementSummary,
  formatVisionOrthoDate,
  isUrgenceAbsolueLead,
} from "@/lib/pv-overlap";
import type { PublicLead } from "@/lib/types";
import SolarSimulator from "@/components/SolarSimulator";
import PurchaseButton from "@/components/PurchaseButton";
import { FlagBadge } from "@/components/LeadTable";
import LeadTierBadge from "@/components/LeadTierBadge";
import LeadConfidencePanel from "@/components/LeadConfidencePanel";
import LeadAvailabilityBadge from "@/components/LeadAvailabilityBadge";
import { catalogAuthHeaders } from "@/lib/preview-catalog";
import { isLeadSlotOpen } from "@/lib/lead-slots";
import { formatAperAnnualFine } from "@/lib/aper-fine";
import { LEAD_REPLACEMENT_GUARANTEE } from "@/lib/guarantee";
import { useSolarAnalytics, trackLeadView } from "@/lib/analytics";

function MaskedRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="select-none rounded bg-white/10 px-8 py-1 blur-[3px]">██████</span>
    </div>
  );
}

function LeadDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const plausible = useSolarAnalytics();
  const [lead, setLead] = useState<PublicLead | null>(null);
  const [isOwned, setIsOwned] = useState(false);
  const [sampleRemaining, setSampleRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      try {
        const res = await fetch(`/api/leads/${id}`, {
          headers: catalogAuthHeaders(token),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data.needsOnboarding) {
          router.replace("/onboarding");
          return;
        }
        if (!res.ok) {
          setError(data.error || "Lead introuvable.");
          return;
        }
        setLead(data.lead);
        setIsOwned(!!data.is_owned);
        setSampleRemaining(data.catalog?.sampleRemaining ?? 0);
      } catch {
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  useEffect(() => {
    if (!lead) return;
    trackLeadView(plausible, {
      tier: lead.tier,
      departement: lead.departement,
      flag: lead.flag_urgence,
    });
  }, [lead, plausible]);

  if (loading) {
    return <p className="container-x py-10 text-slate-400">Chargement de la fiche…</p>;
  }

  if (error || !lead) {
    return (
      <div className="container-x py-10">
        <p className="text-red-300">{error || "Lead introuvable."}</p>
        <Link href="/leads" className="mt-4 inline-block text-sm text-solar underline">
          ← Retour au catalogue
        </Link>
      </div>
    );
  }

  const displayPrix = sampleRemaining > 0 ? 0 : lead.prix_lead;
  const buyersCount = lead.buyers_count ?? 0;
  const slotOpen = isLeadSlotOpen({ buyers_count: buyersCount, statut: lead.statut });
  const isUrgence = isUrgenceAbsolueLead(lead);
  const recouvrement = displayRecouvrementSummary(lead);
  const recouvrementSource = displayRecouvrementSourceLine(lead);

  return (
    <div className="container-x py-10">
      <Link href="/leads" className="text-sm text-slate-400 hover:text-white">← Tous les leads</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <FlagBadge flag={lead.flag_urgence} />
            <LeadTierBadge tier={lead.tier} />
            <LeadAvailabilityBadge available={slotOpen} />
            <span className="text-xs text-slate-400" title="Qualité des sources — pas une probabilité de vente">
              Confiance {(lead.score_confiance ?? 0).toFixed(2)} · {scoreLabel(lead.score_confiance)}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-400">
            Fiche de prospection B2B : parking APER qualifié + contacts entreprise débloqués à
            l&apos;achat. L&apos;indice de confiance résume la fiabilité de chaque signal.
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {lead.nom_osm || "Parking non conforme"}
          </h1>
          <p className="mt-1 text-slate-400">
            {lead.ville || "Localisation"} · {lead.region ?? ""} ({lead.departement})
          </p>

          <div className="card mt-6 grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-3 lg:grid-cols-5">
            <Fact label="Surface parking" value={`${nf(lead.surface_m2)} m²`} />
            <Fact label="Surface solaire" value={`${nf(lead.surface_solaire_m2)} m²`} />
            <Fact label="Puissance" value={`${nf(lead.puissance_kwc)} kWc`} />
            <Fact
              label="Recouvrement"
              value={recouvrement.short}
              title={recouvrement.detail}
              subtitle={
                isUrgence && lead.vision_ortho_date
                  ? formatVisionOrthoDate(lead.vision_ortho_date) ?? undefined
                  : undefined
              }
            />
            <Fact label="Valeur chantier" value={eurosCompact(lead.valeur_chantier_eur)} highlight />
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {recouvrement.detail}
            {recouvrementSource ? ` ${recouvrementSource}` : ""}
          </p>

          <h2 className="mt-10 text-lg font-semibold">Simulateur de potentiel</h2>
          <p className="mb-3 text-sm text-slate-400">Pré-rempli avec la surface réelle de ce parking.</p>
          <SolarSimulator surfaceFromLead={Math.round(lead.surface_m2)} locked />

          <div className="mt-10">
            <LeadConfidencePanel lead={lead} />
          </div>

          {(lead.derogation_pente || lead.derogation_abf) && (
            <div className="card mt-4 border-amber-500/30 p-5 text-sm text-slate-300">
              <div className="font-semibold text-amber-300">Dérogations à vérifier</div>
              {lead.derogation_pente && (
                <p className="mt-2">
                  ⚠️ Pente terrain estimée
                  {typeof lead.pente_pct === "number" ? ` : ${lead.pente_pct}\u00a0%` : ""}. Une pente
                  &gt; 5&nbsp;% peut ouvrir droit à dérogation (art. R111-19-4). Vérification
                  recommandée avant engagement commercial.
                </p>
              )}
              {lead.derogation_abf && (
                <p className="mt-2">
                  ⚠️ Zone ABF / patrimoine historique détectée. L&apos;installation d&apos;ombrières
                  peut nécessiter l&apos;accord de l&apos;Architecte des Bâtiments de France.
                </p>
              )}
            </div>
          )}
        </div>

        <aside>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Ce que vous achetez</h2>
            <p className="mt-2 text-sm text-slate-400">
              Un <strong className="text-slate-200">lead</strong> = parking qualifié + contacts B2B
              : exploitant et propriétaire foncier, avec leurs dirigeants lorsque identifiés.
              L&apos;indice de confiance résume la fiabilité de chaque signal.
            </p>
            <div className="mt-4">
              <MaskedRow label="Exploitant — raison sociale" />
              <MaskedRow label="Exploitant — SIREN" />
              <MaskedRow label="Dirigeant exploitant" />
              <MaskedRow label="Tél. exploitant" />
              <MaskedRow label="Propriétaire des murs" />
              <MaskedRow label="Dirigeant propriétaire" />
              <MaskedRow label="Tél. propriétaire" />
              <MaskedRow label="Email" />
              <MaskedRow label="Adresse exacte" />
              <MaskedRow label="Parcelle cadastrale" />
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-sm text-slate-400">
                  {sampleRemaining > 0 ? "Échantillon gratuit" : `Prix lead ${lead.tier === "premium" ? "Premium" : "Standard"}`}
                </span>
                <span className="text-2xl font-bold text-solar">
                  {sampleRemaining > 0 ? "0 €" : `${lead.prix_lead} €`}
                </span>
              </div>
              <PurchaseButton
                leadId={lead.id}
                prix={displayPrix}
                tier={lead.tier}
                departement={lead.departement}
                flag={lead.flag_urgence}
                full
                sampleRemaining={sampleRemaining}
                disabled={isOwned || !slotOpen}
                disabledReason={isOwned ? "owned" : "sold_out"}
              />
              <p className="mt-3 text-center text-xs text-slate-500">
                {isOwned
                  ? "Ce lead est dans votre espace client."
                  : sampleRemaining > 0
                  ? `${sampleRemaining} crédit échantillon restant${sampleRemaining > 1 ? "s" : ""} dans votre département.`
                  : "Prix pour un achat unitaire. Avec un Pack Territoire actif, le checkout peut utiliser un crédit inclus à la place du paiement Stripe."}
                {!isOwned && (
                  <>
                    {" "}
                    Garantie : {LEAD_REPLACEMENT_GUARANTEE}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="card mt-4 p-5 text-sm text-slate-400">
            <div className="font-semibold text-slate-200">Pourquoi ce lead&nbsp;?</div>
            <p className="mt-2">
              Soumis à l&apos;obligation d&apos;ombrières (loi APER). Le non-équipement expose
              le propriétaire à une amende pouvant atteindre{" "}
              <span className="text-solar">{formatAperAnnualFine(lead.surface_m2)}</span>.
              Valeur de chantier estimée : <span className="text-solar">{euros(lead.valeur_chantier_eur)}</span>.
            </p>
          </div>


          {lead.detection !== "equipe" && (lead.pv_registry_count ?? 0) > 0 && (
            <div className="card mt-4 p-5 text-sm text-slate-400">
              <div className="font-semibold text-slate-200">À titre indicatif</div>
              <p className="mt-2">
                {lead.pv_registry_count} installation{(lead.pv_registry_count ?? 0) > 1 ? "s" : ""}{" "}
                photovoltaïque{(lead.pv_registry_count ?? 0) > 1 ? "s" : ""} de puissance comparable
                {" "}recensée{(lead.pv_registry_count ?? 0) > 1 ? "s" : ""} dans la commune (registre
                ODRÉ). Information communale, sans lien établi avec ce parking précis : elle
                n&apos;indique pas que ce parking est équipé.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function LeadDetailClient({ id }: { id: string }) {
  return <LeadDetailContent id={id} />;
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
    <div className={`bg-night-800 p-4 ${highlight ? "bg-solar/10" : ""}`} title={title}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${highlight ? "text-solar" : "text-white"}`}>{value}</div>
      {subtitle ? <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div> : null}
    </div>
  );
}
