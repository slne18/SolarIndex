import { eurosCompact, nf } from "@/lib/format";
import { DEMO_FICHE } from "@/lib/demo-fiche";
import SectionEyebrow from "@/components/SectionEyebrow";
import LeadTierBadge from "@/components/LeadTierBadge";
import LeadCompletenessBadge, { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
import { FlagBadge } from "@/components/LeadTable";

function DemoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-200">{value}</span>
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
    <div className={`bg-night-800/80 p-4 ${highlight ? "bg-solar/10" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${highlight ? "text-solar" : "text-white"}`}>{value}</div>
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

const DEMO_CONFIDENCE = [
  {
    kind: "ok" as const,
    label: "Revêtement du parking",
    detail: "Asphalte ou béton confirmé sur OpenStreetMap.",
  },
  {
    kind: "ok" as const,
    label: "Surface cadastrale",
    detail: "Surface officielle IGN retenue pour le calcul APER.",
  },
  {
    kind: "info" as const,
    label: "Registre PV communal (ODRÉ)",
    detail: DEMO_FICHE.odre_communal,
  },
];

export default function LeadDemoFiche() {
  const dirigeantExploitant = `${DEMO_FICHE.dirigeant_exploitant} · ${DEMO_FICHE.dirigeant_exploitant_qualite}`;
  const dirigeantProprio = `${DEMO_FICHE.dirigeant_proprietaire} · ${DEMO_FICHE.dirigeant_proprietaire_qualite}`;

  return (
    <section id="demo" className="py-12">
      <SectionEyebrow>Exemple de lead · Fiche démo</SectionEyebrow>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
              <FlagBadge flag="URGENCE_ABSOLUE" />
              <LeadTierBadge tier="premium" />
              <LeadDirigeantBadge />
              <LeadCompletenessBadge pct={DEMO_FICHE.completude_pct} />
              <span className="text-xs text-slate-500">
                Confiance {DEMO_FICHE.score_confiance.toFixed(2)} · Élevé
              </span>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-slate-500">
                Aperçu d&apos;une fiche réelle après achat — toutes les valeurs ci-dessous sont
                fictives.
              </p>
              <h3 className="mt-3 text-2xl font-bold text-white">{DEMO_FICHE.exploitant}</h3>
              <p className="mt-1 text-sm text-slate-500">Site OSM : {DEMO_FICHE.nom_osm}</p>
              <p className="mt-1 text-sm text-slate-500">
                {DEMO_FICHE.ville} · {DEMO_FICHE.region} ({DEMO_FICHE.departement})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/[0.04] sm:grid-cols-3 lg:grid-cols-5">
              <Fact label="Surface parking" value={`${nf(DEMO_FICHE.surface_m2)} m²`} />
              <Fact label="Surface solaire" value={`${nf(DEMO_FICHE.surface_solaire_m2)} m²`} />
              <Fact label="Puissance" value={`${nf(DEMO_FICHE.puissance_kwc)} kWc`} />
              <Fact label="Recouvrement" value={DEMO_FICHE.recouvrement} />
              <Fact label="Valeur chantier" value={eurosCompact(DEMO_FICHE.valeur_chantier_eur)} highlight />
            </div>
          </div>

          <div className="card mt-6 p-6">
            <div className="font-semibold text-slate-200">Indice de confiance (extrait)</div>
            <ul className="mt-4 space-y-3">
              {DEMO_CONFIDENCE.map((f) => (
                <li key={f.label} className="flex gap-3 text-sm">
                  <DemoFactorIcon kind={f.kind} />
                  <div>
                    <div className="font-medium text-slate-200">{f.label}</div>
                    <div className="text-slate-400">{f.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white">Ce que vous recevez à l&apos;achat</h3>
            <p className="mt-2 text-sm text-slate-500">
              Exemple des champs débloqués sur une vraie fiche — identité entreprise, parcelle et
              GPS (données fictives).
            </p>
            <div className="mt-4">
              <DemoRow label="Exploitant — raison sociale" value={DEMO_FICHE.exploitant} />
              <DemoRow label="Exploitant — SIREN" value={DEMO_FICHE.exploitant_siren} />
              <DemoRow label="Dirigeant exploitant" value={dirigeantExploitant} />
              <DemoRow label="Propriétaire des murs" value={DEMO_FICHE.proprietaire} />
              <DemoRow label="Dirigeant propriétaire" value={dirigeantProprio} />
              <DemoRow label="Adresse exacte" value={DEMO_FICHE.adresse} />
              <DemoRow label="Parcelle cadastrale" value={DEMO_FICHE.id_parcelle} />
              <DemoRow label="Coordonnées GPS" value={DEMO_FICHE.gps} />
            </div>
          </div>
        </aside>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-500">
        Fiche illustrative — données entièrement fictives. Chaque lead livré cible une entreprise
        (personne morale), jamais un particulier.
      </p>
    </section>
  );
}
