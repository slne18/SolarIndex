import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";
import { LEAD_REPLACEMENT_GUARANTEE } from "@/lib/guarantee";
import { PRIX_LEAD } from "@/lib/leads";
import { MAX_BUYERS_PER_LEAD } from "@/lib/lead-slots";
import { PRIX_RFP } from "@/lib/rfp";
import { TERRITOIRE_LEADS_QUOTA, TERRITOIRE_PACK_EUR } from "@/lib/subscription";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Conditions générales de vente — ${SITE_NAME}`,
  description: "CGV SolarIndex — achat de leads et appels d'offres solaires.",
};

export default function CgvPage() {
  return (
    <LegalPageShell title="Conditions générales de vente" updatedAt="15 juillet 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes CGV régissent la vente de services numériques proposés par {SITE_NAME} :
          accès à des fiches de leads automatisés (parkings APER) et accès aux coordonnées d&apos;appels
          d&apos;offres déposés par des gérants. Client : tout professionnel disposant d&apos;un compte
          sur la plateforme.
        </p>
      </section>

      <section>
        <h2>2. Produits et tarifs</h2>
        <ul>
          <li>
            Lead automatisé Standard : {PRIX_LEAD.standard} € TTC / fiche.
          </li>
          <li>
            Lead automatisé Premium : {PRIX_LEAD.premium} € TTC / fiche.
          </li>
          <li>
            Pack Territoire : {TERRITOIRE_PACK_EUR} € TTC pour {TERRITOIRE_LEADS_QUOTA} crédits lead
            (décomptés au checkout selon les règles affichées).
          </li>
          <li>
            Appel d&apos;offres &lt; 10 000 m² : {PRIX_RFP.sous_10000} € TTC.
          </li>
          <li>
            Appel d&apos;offres ≥ 10 000 m² : {PRIX_RFP.a_partir_10000} € TTC.
          </li>
        </ul>
        <p>Les tarifs en vigueur sont ceux affichés sur le site au moment de la commande.</p>
      </section>

      <section>
        <h2>3. Commande et paiement</h2>
        <p>
          La commande est validée après paiement intégral via Stripe. Le déblocage de la fiche est
          immédiat dans l&apos;espace « Mon espace ». Aucun remboursement n&apos;est dû une fois la
          fiche débloquée, sauf application de la garantie prévue à l&apos;article 5.
        </p>
      </section>

      <section>
        <h2>4. Nature du service</h2>
        <p>
          Un lead est une opportunité de prospection documentée, non un contrat de travaux. Jusqu&apos;à{" "}
          {MAX_BUYERS_PER_LEAD} installateurs peuvent acquérir le même lead automatisé. Le client
          s&apos;engage à utiliser les données conformément au RGPD et à la réglementation de la
          prospection B2B.
        </p>
      </section>

      <section>
        <h2>5. Garantie de remplacement (leads automatisés)</h2>
        <p>{LEAD_REPLACEMENT_GUARANTEE}</p>
        <p>
          La demande doit être adressée sous 48 h à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> avec les éléments de preuve.
        </p>
      </section>

      <section>
        <h2>6. Appels d&apos;offres</h2>
        <p>
          Les coordonnées déposées le sont volontairement par le déposant, qui garantit leur exactitude.
          {SITE_NAME} modère les publications sans garantir l&apos;aboutissement d&apos;un chantier.
        </p>
      </section>

      <section>
        <h2>7. Droit de rétractation</h2>
        <p>
          Contenu numérique fourni immédiatement après paiement : le client reconnaît renoncer à son
          droit de rétractation une fois la fiche débloquée (art. L221-28 du Code de la consommation,
          lorsque applicable aux professionnels selon leur statut).
        </p>
      </section>

      <section>
        <h2>8. Litiges</h2>
        <p>
          Droit français. Tentative de résolution amiable préalable par{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. À défaut, tribunaux compétents du
          siège social de l&apos;éditeur.
        </p>
      </section>
    </LegalPageShell>
  );
}
