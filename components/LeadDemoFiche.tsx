import { eurosCompact, nf } from "@/lib/format";
import { DEMO_FICHE } from "@/lib/demo-fiche";
import SectionEyebrow from "@/components/SectionEyebrow";
import LeadTierBadge from "@/components/LeadTierBadge";
import LeadCompletenessBadge, { LeadDirigeantBadge } from "@/components/LeadCompletenessBadge";
import { FlagBadge } from "@/components/LeadTable";

function MaskedRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="select-none rounded bg-white/10 px-8 py-1 blur-[3px] text-slate-400">██████</span>
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

export default function LeadDemoFiche() {
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
                Fiche de prospection B2B : parking APER qualifié + identité entreprise débloquée à
                l&apos;achat (SIREN, parcelle, GPS).
              </p>
              <h3 className="mt-3 text-2xl font-bold text-white">{DEMO_FICHE.nom}</h3>
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

          <div className="card mt-6 p-5 text-sm text-slate-400">
            <div className="font-semibold text-slate-200">Indice de confiance (extrait)</div>
            <ul className="mt-3 space-y-2">
              <li>✓ Revêtement parking confirmé sur OpenStreetMap</li>
              <li>✓ Surface cadastrale retenue pour le calcul</li>
              <li>! Registre PV communal : signal faible, sans lien établi avec ce parking</li>
            </ul>
          </div>
        </div>

        <aside>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white">Ce que vous achetez</h3>
            <p className="mt-2 text-sm text-slate-500">
              Identité entreprise + parcelle cadastrale + coordonnées GPS — débloquées à l&apos;achat.
            </p>
            <div className="mt-4">
              <MaskedRow label="Exploitant — raison sociale" />
              <MaskedRow label="Exploitant — SIREN" />
              <MaskedRow label="Dirigeant exploitant" />
              <MaskedRow label="Propriétaire des murs" />
              <MaskedRow label="Adresse exacte" />
              <MaskedRow label="Parcelle cadastrale" />
              <MaskedRow label="Coordonnées GPS" />
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-white/[0.06] pt-4">
              <span className="text-sm text-slate-500">Prix lead Premium</span>
              <span className="text-2xl font-bold text-solar">49 €</span>
            </div>
          </div>
        </aside>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-500">
        Fiche illustrative — données fictives. Chaque lead livré cible une entreprise (personne
        morale), jamais un particulier.
      </p>
    </section>
  );
}
