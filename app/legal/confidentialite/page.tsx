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
            <strong>Navigation</strong> : logs techniques, cookies de session d&apos;authentification
            (Supabase).
          </li>
          <li>
            <strong>Mesure d&apos;audience</strong> : via{" "}
            <a href="https://plausible.io" rel="noopener noreferrer">
              Plausible Analytics
            </a>{" "}
            (statistiques agrégées de fréquentation : pages vues, pays, type d&apos;appareil, source
            de trafic). Plausible ne dépose pas de cookies de suivi et ne collecte pas de données
            personnelles identifiables à des fins publicitaires.
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
          <li>
            Mesure d&apos;audience et amélioration du site — art. 6.1.f RGPD (intérêt légitime),
            via Plausible, outil configuré sans cookies publicitaires.
          </li>
          <li>Obligations comptables et légales — art. 6.1.c RGPD.</li>
        </ul>
      </section>

      <section>
        <h2>4. Destinataires</h2>
        <p>
          Sous-traitants : Supabase (hébergement base de données), Vercel (hébergement application),
          Stripe (paiement), Resend (emails transactionnels le cas échéant), Plausible Analytics
          (statistiques de fréquentation). Aucune revente de données personnelles à des tiers.
        </p>
      </section>

      <section>
        <h2>5. Durées de conservation</h2>
        <ul>
          <li>Compte client : durée de la relation commerciale + 3 ans.</li>
          <li>Factures et preuves d&apos;achat : 10 ans.</li>
          <li>Logs techniques : 12 mois maximum.</li>
          <li>Statistiques Plausible : selon la politique de conservation de Plausible (données agrégées).</li>
        </ul>
      </section>

      <section>
        <h2>6. Vos droits RGPD</h2>
        <p>
          Conformément au RGPD, vous disposez des droits suivants sur vos <strong>données personnelles</strong>{" "}
          (celles qui vous identifient en tant que personne physique) :
        </p>
        <ul>
          <li>
            <strong>Accès</strong> — obtenir confirmation que nous traitons vos données et en recevoir
            une copie.
          </li>
          <li>
            <strong>Rectification</strong> — faire corriger des données inexactes ou incomplètes.
          </li>
          <li>
            <strong>Effacement</strong> — demander la suppression dans les cas prévus par la loi (voir
            ci-dessous).
          </li>
          <li>
            <strong>Limitation</strong> — demander le gel temporaire du traitement dans certaines
            situations (contestation de l&apos;exactitude, traitement illicite, etc.).
          </li>
          <li>
            <strong>Opposition</strong> — vous opposer à un traitement fondé sur l&apos;intérêt légitime,
            notamment la prospection, sous réserve de motifs légitimes impérieux de notre part.
          </li>
          <li>
            <strong>Portabilité</strong> — recevoir les données que vous nous avez fournies, dans un
            format structuré, lorsque le traitement est fondé sur le contrat ou le consentement et
            automatisé.
          </li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-slate-800">Quand ces droits s&apos;appliquent-ils ?</h3>
        <ul>
          <li>
            <strong>Compte installateur</strong> (email, entreprise, achats) : tous les droits
            ci-dessus s&apos;appliquent. Contact :{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
          <li>
            <strong>Déposant d&apos;appel d&apos;offres</strong> (coordonnées volontairement transmises) :
            accès, rectification, effacement et opposition applicables sur vos coordonnées de contact.
          </li>
          <li>
            <strong>Données B2B des leads</strong> (exploitants, dirigeants, propriétaires fonciers) :
            issues de sources publiques ou de recoupements professionnels. En tant que personne
            concernée au sens du RGPD, vous pouvez exercer votre <strong>droit d&apos;opposition</strong>{" "}
            à leur indexation à des fins de prospection en nous contactant avec votre qualité et un
            justificatif. Les autres droits (portabilité, etc.) ne s&apos;appliquent en principe pas aux
            fiches leads que vous achetez en tant qu&apos;installateur, car il ne s&apos;agit pas de vos
            données personnelles.
          </li>
          <li>
            <strong>Mesure d&apos;audience Plausible</strong> : sans cookies de suivi, Plausible ne
            permet en pratique pas de vous ré-identifier individuellement. Vous pouvez néanmoins
            utiliser un bloqueur de scripts ou nous écrire si vous souhaitez formuler une opposition.
          </li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-slate-800">Limites à l&apos;effacement</h3>
        <p>
          Nous ne pouvons pas toujours supprimer immédiatement toutes les données : les factures et
          éléments comptables doivent être conservés 10 ans ; un achat déjà réalisé peut laisser une
          trace contractuelle nécessaire à la gestion du service et à la garantie de remplacement.
        </p>

        <p className="mt-4">
          Délai de réponse : 1 mois maximum. Réclamation possible auprès de la CNIL (
          <a href="https://www.cnil.fr">cnil.fr</a>).
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
