import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";
import { LEAD_REPLACEMENT_GUARANTEE } from "@/lib/guarantee";
import { PRIX_LEAD } from "@/lib/leads";
import { MAX_BUYERS_PER_LEAD } from "@/lib/lead-slots";
import { PRIX_RFP } from "@/lib/rfp";
import { RFP_MAX_BUYERS_PER_SUBMISSION, RFP_SERVICE_SUMMARY, RFP_TOOLS_DISCLAIMER } from "@/lib/rfp-legal";
import { TERRITOIRE_LEADS_QUOTA, TERRITOIRE_PACK_EUR } from "@/lib/subscription";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Conditions générales de vente — ${SITE_NAME}`,
  description: "CGV SolarIndex — achat de leads et consultation installateurs (dépôts de projets parking).",
};

export default function CgvPage() {
  return (
    <LegalPageShell title="Conditions générales de vente" updatedAt="15 juillet 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes CGV régissent la vente de services numériques proposés par {SITE_NAME} :
          accès à des fiches de leads automatisés (parkings APER) et accès aux coordonnées de projets
          parking déposés volontairement par des gestionnaires ou propriétaires privés
          («&nbsp;consultation installateurs&nbsp;», désignée commercialement «&nbsp;appel
          d&apos;offres&nbsp;» sur le site). Client : tout professionnel disposant d&apos;un compte
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
            Accès installateur — projet &lt; 10 000 m² : {PRIX_RFP.sous_10000} € TTC.
          </li>
          <li>
            Accès installateur — projet ≥ 10 000 m² : {PRIX_RFP.a_partir_10000} € TTC.
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
        <p>
          {RFP_SERVICE_SUMMARY} {RFP_TOOLS_DISCLAIMER}
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

      <section id="rfp-deposants">
        <h2>6. Dépôts de projets parking (déposants)</h2>
        <p>
          La présente section s&apos;applique à toute personne morale ou physique agissant pour le
          compte d&apos;un gestionnaire ou propriétaire de parking qui dépose un projet via le
          formulaire du site.
        </p>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.1. Nature du service — ce que SolarIndex n&apos;est pas</h3>
        <ul>
          <li>
            {SITE_NAME} n&apos;est <strong>pas</strong> une plateforme de passation de marchés
            publics, ni un support de publication au BOAMP ou équivalent.
          </li>
          <li>
            Le dépôt d&apos;un projet sur {SITE_NAME} <strong>ne constitue pas</strong> un appel
            d&apos;offres au sens du Code de la commande publique et ne se substitue pas à une
            procédure formalisée (publicité, critères, délais, candidatures, recours).
          </li>
          <li>
            {SITE_NAME} n&apos;est pas mandataire du déposant, n&apos;organise pas la sélection
            d&apos;un lauréat, ne négocie pas les contrats de travaux et ne garantit aucun résultat
            économique, technique ou réglementaire.
          </li>
          <li>
            Les outils d&apos;estimation, simulateurs et vérificateurs d&apos;éligibilité APER sont
            fournis à titre indicatif et ne remplacent ni un audit réglementaire, ni un conseil
            juridique, urbanistique, fiscal ou technique.
          </li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.2. Personnes publiques — exclusion</h3>
        <p>
          Les personnes publiques, établissements publics et entités soumises au Code de la commande
          publique <strong>ne peuvent pas</strong> déposer de projet via {SITE_NAME}. Le déposant
          déclare sur l&apos;honneur ne pas relever de cette catégorie pour le projet concerné, ou
          que le dépôt ne vise pas à remplacer une procédure de marché public. {SITE_NAME} se réserve
          le droit de refuser ou retirer tout dépôt manifestement émanant d&apos;une personne publique
          ou contraire à l&apos;ordre public des marchés.
        </p>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.3. Processus de dépôt</h3>
        <ul>
          <li>Création d&apos;un compte et formulaire en ligne.</li>
          <li>Vérification de l&apos;adresse email du contact.</li>
          <li>Modération éditoriale par {SITE_NAME} (délai indicatif : 48 h ouvrées).</li>
          <li>Publication au catalogue « consultation installateurs » si le dépôt est accepté.</li>
        </ul>
        <p>
          {SITE_NAME} peut refuser ou retirer un dépôt sans indemnité, notamment en cas
          d&apos;informations inexactes, de contenu illicite, de non-conformité aux présentes CGV ou
          de doute sur le statut du déposant.
        </p>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.4. Transmission des coordonnées</h3>
        <p>
          Le déposant communique volontairement ses coordonnées professionnelles (nom, email,
          téléphone, SIRET, description du projet). Jusqu&apos;à {RFP_MAX_BUYERS_PER_SUBMISSION}{" "}
          installateurs professionnels peuvent, moyennant paiement à {SITE_NAME}, débloquer l&apos;accès
          à ces coordonnées et contacter le déposant pour une proposition commerciale.
        </p>
        <ul>
          <li>Le dépôt n&apos;est pas exclusif : plusieurs installateurs peuvent accéder au même projet.</li>
          <li>
            {SITE_NAME} ne contrôle pas la teneur des propositions commerciales, des devis ni la
            conclusion d&apos;un contrat entre le déposant et un installateur.
          </li>
          <li>
            Le déposant reste libre de choisir ou de ne pas choisir un installateur contacté via la
            plateforme.
          </li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.5. Obligations du déposant</h3>
        <ul>
          <li>Fournir des informations exactes, complètes et à jour.</li>
          <li>
            Disposer des droits et habilitations nécessaires pour lancer la démarche (notamment en cas
            de parking en concession, délégation de service public ou location-gérance).
          </li>
          <li>
            Comparer plusieurs propositions et vérifier les qualifications de l&apos;installateur
            retenu (RGE le cas échéant, assurances, certifications).
          </li>
          <li>
            Se conformer aux règles applicables en matière d&apos;urbanisme, de sécurité, de
            réglementation APER et, le cas échéant, de passation de marchés.
          </li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.6. Données personnelles</h3>
        <p>
          Le traitement des coordonnées déposées est décrit dans la{" "}
          <a href="/legal/confidentialite">Politique de confidentialité</a>. Le déposant peut exercer
          ses droits (accès, rectification, effacement, opposition) en contactant{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.7. Absence de garantie</h3>
        <p>
          {SITE_NAME} modère les dépôts sans garantir l&apos;aboutissement d&apos;un chantier, le
          nombre de contacts reçus, la qualité des installateurs ni la conformité réglementaire du
          projet. Le dépôt est gratuit pour le déposant ; la rémunération de {SITE_NAME} provient du
          paiement des installateurs pour l&apos;accès aux coordonnées.
        </p>
      </section>

      <section id="rfp-installateurs">
        <h2>7. Accès installateur aux dépôts de projets</h2>
        <p>
          L&apos;installateur qui achète l&apos;accès à un dépôt obtient les coordonnées
          volontairement transmises par le déposant. Il reconnaît que :
        </p>
        <ul>
          <li>Il ne s&apos;agit pas d&apos;un marché public attribué ni d&apos;une exclusivité.</li>
          <li>
            D&apos;autres installateurs peuvent accéder au même dépôt (jusqu&apos;à{" "}
            {RFP_MAX_BUYERS_PER_SUBMISSION} accès).
          </li>
          <li>
            Le déposant reste libre de retenir ou non sa proposition ; aucun droit au « gain » du
            projet n&apos;est acquis par le seul paiement à {SITE_NAME}.
          </li>
          <li>
            Il utilisera les coordonnées conformément au RGPD et à la réglementation de la
            prospection B2B, sans démarchage abusif.
          </li>
        </ul>
        <p>
          Aucun remboursement n&apos;est dû une fois les coordonnées débloquées, sauf erreur
          manifeste imputable à {SITE_NAME} (coordonnées manifestement invalides).
        </p>
      </section>

      <section>
        <h2>8. Droit de rétractation</h2>
        <p>
          Contenu numérique fourni immédiatement après paiement : le client reconnaît renoncer à son
          droit de rétractation une fois la fiche débloquée (art. L221-28 du Code de la consommation,
          lorsque applicable aux professionnels selon leur statut).
        </p>
      </section>

      <section>
        <h2>9. Litiges</h2>
        <p>
          Droit français. Tentative de résolution amiable préalable par{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. À défaut, tribunaux compétents du
          siège social de l&apos;éditeur.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Les présentes CGV ne dispensent pas le déposant ni l&apos;installateur de se conformer aux
          lois et règlements applicables à leur activité. En cas de doute (marchés publics, APER,
          urbanisme), il est recommandé de consulter un conseil juridique ou technique compétent.
        </p>
      </section>
    </LegalPageShell>
  );
}
