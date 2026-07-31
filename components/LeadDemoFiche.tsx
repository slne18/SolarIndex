"use client";

import { eurosCompact, nf } from "@/lib/format";
import { DEMO_FICHE } from "@/lib/demo-fiche";
import { fmt } from "@/lib/i18n/format";
import { scoreLevelKey } from "@/lib/i18n/leads-labels";
import { useTranslations } from "@/components/LocaleProvider";
import SectionEyebrow from "@/components/SectionEyebrow";
import LeadTierBadge from "@/components/LeadTierBadge";
import LeadCompletenessBadge, { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
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
      <div className={`lead-demo-fact-value mt-1 text-lg font-bold`}>{value}</div>
    </div>
  );
}

function DemoFactorIcon({ kind }: { kind: "ok" | "info" }) {
  if (kind === "ok") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] font-bold text-sky-300"
      aria-hidden
      title="Information indicative"
    >
      i
    </span>
  );
}

export default function LeadDemoFiche() {
  const t = useTranslations();
  const dirigeantExploitant = `${DEMO_FICHE.dirigeant_exploitant} · ${DEMO_FICHE.dirigeant_exploitant_qualite}`;
  const dirigeantProprio = `${DEMO_FICHE.dirigeant_proprietaire} · ${DEMO_FICHE.dirigeant_proprietaire_qualite}`;
  const score = DEMO_FICHE.score_confiance.toFixed(2);
  const level = t(scoreLevelKey(DEMO_FICHE.score_confiance));

  const demoFactors = [
    { kind: "ok" as const, label: t("leads.demo.factor1.label"), detail: t("leads.demo.factor1.detail") },
    { kind: "ok" as const, label: t("leads.demo.factor2.label"), detail: t("leads.demo.factor2.detail") },
    { kind: "info" as const, label: t("leads.demo.factor3.label"), detail: DEMO_FICHE.odre_communal },
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
              <LeadCompletenessBadge pct={DEMO_FICHE.completude_pct} />
              <span className="text-xs text-slate-500">
                {fmt(t("leads.demo.confidence"), { score, level })}
              </span>
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

            <div className="grid grid-cols-2 gap-px bg-white/[0.04] sm:grid-cols-3 lg:grid-cols-5">
              <Fact label={t("leads.demo.factSurface")} value={`${nf(DEMO_FICHE.surface_m2)} m²`} />
              <Fact label={t("leads.demo.factSolar")} value={`${nf(DEMO_FICHE.surface_solaire_m2)} m²`} />
              <Fact label={t("leads.demo.factPower")} value={`${nf(DEMO_FICHE.puissance_kwc)} kWc`} />
              <Fact label={t("leads.demo.factCoverage")} value={DEMO_FICHE.recouvrement} />
              <Fact
                label={t("leads.demo.factProjectValue")}
                value={eurosCompact(DEMO_FICHE.valeur_chantier_eur)}
                highlight
              />
            </div>
          </div>

          <div className="card mt-6 p-6">
            <div className="lead-demo-confidence font-semibold text-slate-200">{t("leads.demo.confidenceTitle")}</div>
            <ul className="mt-4 space-y-3">
              {demoFactors.map((f) => (
                <li key={f.label} className="flex gap-3 text-sm">
                  <DemoFactorIcon kind={f.kind} />
                  <div>
                    <div className="lead-demo-factor-label font-medium text-slate-200">{f.label}</div>
                    <div className="text-slate-400">{f.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
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
