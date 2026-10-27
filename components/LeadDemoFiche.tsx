"use client";

import { eurosCompact, nf } from "@/lib/format";
import { DEMO_FICHE } from "@/lib/demo-fiche";
import { fmt } from "@/lib/i18n/format";
import {
  confidenceFactorLabelKey,
  scoreLevelKey,
  tierLabelKey,
  type ConfidenceFactorId,
} from "@/lib/i18n/leads-labels";
import { useTranslations } from "@/components/LocaleProvider";
import SectionEyebrow from "@/components/SectionEyebrow";
import LeadTierBadge from "@/components/LeadTierBadge";
import { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
import { FlagBadge } from "@/components/LeadTable";

function DemoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="demo-row flex items-center justify-between gap-4 border-b border-white/[0.06] py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="demo-row-value text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}

function Fact({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`lead-demo-fact p-4 ${highlight ? "lead-demo-fact-highlight" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="lead-demo-fact-value mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

export default function LeadDemoFiche() {
  const t = useTranslations();

  function completudeLevelLabel(pct: number): string {
    if (pct >= 85) return t("leads.demo.completenessLevelHigh");
    if (pct >= 65) return t("leads.demo.completenessLevelGood");
    if (pct >= 45) return t("leads.demo.completenessLevelMid");
    return t("leads.demo.completenessLevelLow");
  }
  const dirigeantExploitant = `${DEMO_FICHE.dirigeant_exploitant} · ${DEMO_FICHE.dirigeant_exploitant_qualite}`;
  const dirigeantProprio = `${DEMO_FICHE.dirigeant_proprietaire} · ${DEMO_FICHE.dirigeant_proprietaire_qualite}`;
  const score = DEMO_FICHE.score_confiance;
  const pct = DEMO_FICHE.completude_pct;

  const demoFactors: { id: ConfidenceFactorId; ok: boolean; detail: string }[] = [
    {
      id: "solar",
      ok: true,
      detail: fmt(t("leads.demo.factorSolar.detail"), { coverage: DEMO_FICHE.recouvrement }),
    },
    {
      id: "surfacing",
      ok: true,
      detail: t("leads.demo.factor1.detail"),
    },
    {
      id: "cadastral",
      ok: true,
      detail: t("leads.demo.factor2.detail"),
    },
    {
      id: "completeness",
      ok: pct >= 65,
      detail: fmt(t("leads.demo.completenessDetail"), {
        pct,
        level: completudeLevelLabel(pct),
      }),
    },
    {
      id: "registry",
      ok: true,
      detail: DEMO_FICHE.odre_communal,
    },
  ];

  return (
    <section id="demo" className="lead-demo-fiche py-12">
      <SectionEyebrow>{t("leads.demo.eyebrow")}</SectionEyebrow>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
              <FlagBadge flag="URGENCE_ABSOLUE" />
              <LeadTierBadge tier="premium" />
              <LeadDirigeantBadge />
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-slate-500">{t("leads.demo.previewLead")}</p>
              <h3 className="lead-demo-title mt-3 text-2xl font-bold text-white">{DEMO_FICHE.exploitant}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t("leads.demo.siteOsm")} {DEMO_FICHE.nom_osm}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {DEMO_FICHE.ville} · {DEMO_FICHE.region} ({DEMO_FICHE.departement})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-4">
              <Fact label={t("leads.demo.factSurface")} value={`${nf(DEMO_FICHE.surface_m2)} m²`} />
              <Fact label={t("leads.demo.factSolar")} value={`${nf(DEMO_FICHE.surface_solaire_m2)} m²`} />
              <Fact label={t("leads.demo.factPower")} value={`${nf(DEMO_FICHE.puissance_kwc)} kWc`} />
              <Fact
                label={t("leads.demo.factProjectValue")}
                value={eurosCompact(DEMO_FICHE.valeur_chantier_eur)}
                highlight
              />
            </div>
          </div>

          <div className="card mt-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="lead-demo-confidence text-lg font-semibold text-slate-200">
                {t("leads.confidence.title")}
              </h3>
              <LeadTierBadge tier="premium" />
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {fmt(t("leads.confidence.intro"), {
                score: score.toFixed(2),
                level: t(scoreLevelKey(score)),
              })}
            </p>
            <ul className="mt-5 space-y-3">
              {demoFactors.map((f) => (
                <li key={f.id} className="flex gap-3 text-sm">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      f.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"
                    }`}
                    aria-hidden
                  >
                    {f.ok ? "✓" : "!"}
                  </span>
                  <div>
                    <div className="lead-demo-factor-label font-medium text-slate-200">
                      {t(confidenceFactorLabelKey(f.id))}
                    </div>
                    <div className="whitespace-pre-line text-slate-400">{f.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-xs text-slate-400">
              <p>
                <strong className="text-slate-200">{t(tierLabelKey("premium"))}</strong>
                {" — "}
                {t("leads.tier.premiumDesc")}
              </p>
            </div>
          </div>
        </div>

        <aside>
          <div className="card p-6">
            <h3 className="lead-demo-title text-lg font-semibold text-white">{t("leads.demo.purchaseTitle")}</h3>
            <p className="mt-2 text-sm text-slate-500">{t("leads.demo.purchaseLead")}</p>
            <div className="mt-4">
              <DemoRow label={t("leads.demo.rowOperator")} value={DEMO_FICHE.exploitant} />
              <DemoRow label={t("leads.demo.rowSiren")} value={DEMO_FICHE.exploitant_siren} />
              <DemoRow label={t("leads.demo.rowDirectorOp")} value={dirigeantExploitant} />
              <DemoRow label={t("leads.demo.rowOwner")} value={DEMO_FICHE.proprietaire} />
              <DemoRow label={t("leads.demo.rowDirectorOwner")} value={dirigeantProprio} />
              <DemoRow label={t("leads.demo.rowAddress")} value={DEMO_FICHE.adresse} />
              <DemoRow label={t("leads.demo.rowParcel")} value={DEMO_FICHE.id_parcelle} />
              <DemoRow label={t("leads.demo.rowGps")} value={DEMO_FICHE.gps} />
            </div>
          </div>
        </aside>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-500">{t("leads.demo.footer")}</p>
    </section>
  );
}
