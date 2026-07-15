import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Mentions légales — ${SITE_NAME}`,
  description: "Mentions légales du site SolarIndex.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell title="Mentions légales" updatedAt="15 juillet 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          {SITE_NAME} — {SITE_URL}
          <br />
          Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p>
          Directeur de la publication : le représentant légal de la société éditrice.
        </p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Vercel Inc.
          <br />
          440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
          <br />
          <a href="https://vercel.com">vercel.com</a>
        </p>
        <p>
          Base de données : Supabase Inc. —{" "}
          <a href="https://supabase.com">supabase.com</a>
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble du site (textes, charte graphique, logiciels, bases structurées) est protégé
          par le droit d&apos;auteur. Toute reproduction non autorisée est interdite. Les données
          publiques réutilisées restent soumises à leurs licences respectives (Etalab, OpenStreetMap,
          etc.).
        </p>
      </section>

      <section>
        <h2>Sources de données</h2>
        <p>
          OpenStreetMap · Etalab / data.gouv.fr · INSEE SIREN · MAJIC (propriétaires fonciers) ·
          registre photovoltaïque lorsque pertinent. SolarIndex produit un traitement et un enrichissement
          propriétaires à partir de ces sources.
        </p>
      </section>

      <section>
        <h2>Limitation de responsabilité</h2>
        <p>
          {SITE_NAME} fournit des signaux de prospection B2B, non des garanties de signature de
          chantier. L&apos;utilisateur vérifie les informations avant tout engagement commercial.
          {SITE_NAME} ne saurait être tenu responsable des décisions prises sur la base des fiches
          fournies.
        </p>
      </section>
    </LegalPageShell>
  );
}
