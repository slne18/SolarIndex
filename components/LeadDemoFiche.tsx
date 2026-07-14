import { eurosCompact, nf } from "@/lib/format";
import { DEMO_FICHE } from "@/lib/demo-fiche";
import SectionEyebrow from "@/components/SectionEyebrow";

function LeadField({
  label,
  value,
  wide = false,
  highlight = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-night-800/80 px-5 py-4 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm ${highlight ? "font-bold text-solar" : "font-medium text-white"}`}>
        {value}
      </dd>
    </div>
  );
}

export default function LeadDemoFiche() {
  return (
    <section id="demo" className="py-12">
      <SectionEyebrow>Exemple de lead · Fiche démo</SectionEyebrow>
      <div className="mt-8">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
            <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
              Urgence absolue · APER
            </span>
            <span className="text-sm text-slate-400">
              Score {DEMO_FICHE.score_confiance.toFixed(2)}{" "}
              <span className="text-emerald-400">(Élevé)</span>
            </span>
          </div>
          <dl className="grid gap-px bg-white/[0.04] sm:grid-cols-2">
            <LeadField label="Parking" value={DEMO_FICHE.nom} wide />
            <LeadField label="Ville / Dépt" value={`${DEMO_FICHE.ville} · ${DEMO_FICHE.departement}`} />
            <LeadField label="Surface parking" value={`${nf(DEMO_FICHE.surface_m2)} m²`} />
            <LeadField label="Surface solaire" value={`${nf(DEMO_FICHE.surface_solaire_m2)} m² (50 % légal)`} />
            <LeadField label="Puissance estimée" value={`${nf(DEMO_FICHE.puissance_kwc)} kWc`} />
            <LeadField label="Valeur chantier" value={eurosCompact(DEMO_FICHE.valeur_chantier_eur)} highlight />
            <LeadField label="Exploitant" value={DEMO_FICHE.exploitant} />
            <LeadField label="SIREN exploitant" value={DEMO_FICHE.exploitant_siren} />
            <LeadField label="Dirigeant exploitant" value={`${DEMO_FICHE.dirigeant_exploitant} · ${DEMO_FICHE.dirigeant_exploitant_qualite}`} />
            <LeadField label="Propriétaire foncier" value={DEMO_FICHE.proprietaire} />
            <LeadField label="SIREN propriétaire" value={DEMO_FICHE.proprietaire_siren} />
            <LeadField label="Dirigeant propriétaire" value={`${DEMO_FICHE.dirigeant_proprietaire} · ${DEMO_FICHE.dirigeant_proprietaire_qualite}`} />
            <LeadField label="Adresse" value={DEMO_FICHE.adresse} wide />
            <LeadField label="Parcelle cadastrale" value={DEMO_FICHE.id_parcelle} />
            <LeadField label="Prospection" value={DEMO_FICHE.prospection} wide />
          </dl>
        </div>
        <p className="mt-4 w-full text-sm leading-relaxed text-slate-500">
          Fiche illustrative — données fictives. Chaque lead livré cible une entreprise, jamais un
          particulier.
        </p>
      </div>
    </section>
  );
}
