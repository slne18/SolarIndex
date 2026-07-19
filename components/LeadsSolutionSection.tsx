import SectionEyebrow from "@/components/SectionEyebrow";
import SolutionStats from "@/components/SolutionStats";

function ProcessStep({
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
    <li className="solution-process-item">
      <span className="solution-process-num" aria-hidden>
        {n}
      </span>
      <p className="solution-process-tag">{tag}</p>
      <h3 className="solution-process-title">{title}</h3>
      <p className="solution-process-text">{text}</p>
    </li>
  );
}

export default function LeadsSolutionSection() {
  return (
    <section id="solution" className="pb-12">
      <SectionEyebrow>Solution technique</SectionEyebrow>
      <h2 className="section-subtitle mt-3">Ce qui distingue un lead SolarIndex</h2>
      <p className="section-lead mt-4">
        Face à l&apos;obligation APER, nos outils identifient les parkings concernés, les relient
        aux entreprises à contacter et vous livrent une liste filtrée.
      </p>

      <SolutionStats />

      <ol className="solution-process-list" aria-label="Étapes de constitution d'un lead">
        <ProcessStep
          n="01"
          title="Parkings cartographiés OSM"
          text="Identification continue des parkings ≥ 1 500 m² sur OpenStreetMap, avec mesure de surface et détection des panneaux existants."
          tag="Données publiques"
        />
        <ProcessStep
          n="02"
          title="Enrichissement propriétaire"
          text="Chaque site est relié à sa parcelle cadastrale, son adresse, l'exploitant SIREN et le propriétaire foncier MAJIC — personnes morales uniquement."
          tag="Résolution B2B"
        />
        <ProcessStep
          n="03"
          title="Score de confiance par lead"
          text="Chaque fiche est scorée (0 – 1) : revêtement, cadastre, absence de doute PV, photo aérienne. Plus le score est haut, moins de vérifications avant d'appeler."
          tag="Fiabilité documentée"
        />
      </ol>
    </section>
  );
}
