import SectionEyebrow from "@/components/SectionEyebrow";
import SolutionStats from "@/components/SolutionStats";

function StepCard({
  n,
  title,
  text,
  tag,
}: {
  n: string;
  title: string;
  text: string;
  tag: string;
}) {
  return (
    <div className="card p-6">
      <span className="text-xs font-bold tabular-nums text-solar">{n}</span>
      <span className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{tag}</span>
      <h3 className="mt-2 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}

export default function LeadsSolutionSection() {
  return (
    <section id="solution" className="pb-12">
      <SectionEyebrow>Solution technique</SectionEyebrow>
      <h2 className="section-title mt-3">Ce qui distingue un lead SolarIndex</h2>
      <p className="section-lead mt-4">
        Face à l&apos;obligation APER, nos outils identifient les parkings concernés, les relient
        aux entreprises à contacter et vous livrent une liste filtrée.
      </p>

      <SolutionStats />

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <StepCard
          n="01"
          title="Parkings cartographiés OSM"
          text="Identification continue des parkings ≥ 1 500 m² sur OpenStreetMap, avec mesure de surface et détection des panneaux existants."
          tag="Données publiques"
        />
        <StepCard
          n="02"
          title="Enrichissement propriétaire"
          text="Chaque site est relié à sa parcelle cadastrale, son adresse, l'exploitant SIREN et le propriétaire foncier MAJIC — personnes morales uniquement."
          tag="Résolution B2B"
        />
        <StepCard
          n="03"
          title="Score de confiance par lead"
          text="Chaque fiche est scorée (0 – 1) : revêtement, cadastre, absence de doute PV, photo aérienne. Plus le score est haut, moins de vérifications avant d'appeler."
          tag="Fiabilité documentée"
        />
      </div>
    </section>
  );
}
