import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Politique de confidentialité — ${SITE_NAME}`,
  description: "Politique de confidentialité et protection des données SolarIndex.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPageShell title="Politique de confidentialité" updatedAt="15 juillet 2026">
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          {SITE_NAME} ({SITE_URL}) est édité par la société exploitante de la plateforme, joignable à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. Données traitées</h2>
        <ul>
          <li>
            <strong>Compte utilisateur</strong> : email, mot de passe (hashé), nom d&apos;entreprise,
            historique d&apos;achats.
          </li>
          <li>
            <strong>Leads automatisés</strong> : données B2B issues de sources publiques (SIREN,
            cadastre, OpenStreetMap, MAJIC) — personnes morales uniquement.
          </li>
          <li>
            <strong>Appels d&apos;offres</strong> : coordonnées volontairement déposées par le gérant
            ou propriétaire (nom, email, téléphone, SIRET, description du projet).
          </li>
          <li>
            <strong>Paiements</strong> : traités par Stripe ; nous ne stockons pas vos numéros de
            carte bancaire.
          </li>
          <li>
            <strong>Navigation</strong> : logs techniques, cookies de session et mesure d&apos;audience
            (Plausible, si activé).
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li>Fourniture du service et exécution du contrat (CGV) — art. 6.1.b RGPD.</li>
          <li>
            Prospection B2B et indexation de non-conformité réglementaire APER — art. 6.1.f RGPD
            (intérêt légitime), pour les données entreprises publiques.
          </li>
          <li>Obligations comptables et légales — art. 6.1.c RGPD.</li>
        </ul>
      </section>

      <section>
        <h2>4. Destinataires</h2>
        <p>
          Sous-traitants : Supabase (hébergement base de données), Vercel (hébergement application),
          Stripe (paiement), Resend (emails transactionnels le cas échéant). Aucune revente de
          données personnelles à des tiers.
        </p>
      </section>

      <section>
        <h2>5. Durées de conservation</h2>
        <ul>
          <li>Compte client : durée de la relation commerciale + 3 ans.</li>
          <li>Factures et preuves d&apos;achat : 10 ans.</li>
          <li>Logs techniques : 12 mois maximum.</li>
        </ul>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p>
          Accès, rectification, effacement, limitation, opposition et portabilité (lorsque applicable).
          Contact : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Réclamation possible
          auprès de la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
      </section>

      <section>
        <h2>7. Sécurité</h2>
        <p>
          Chiffrement HTTPS, accès restreints aux données sensibles, authentification par token pour
          les API. Les champs sensibles des leads ne sont débloqués qu&apos;après achat vérifié.
        </p>
      </section>
    </LegalPageShell>
  );
}
