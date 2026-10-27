import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";
import { PRIX_LEAD } from "@/lib/leads";
import { PRIX_PLATEFORME_MENSUEL } from "@/lib/platform-access";
import { PRIX_RFP } from "@/lib/rfp";
import {
  INSTALLER_NO_PERFORMANCE_CLAUSE,
  INSTALLER_PURCHASE_IS_INFORMATION_ONLY,
  RFP_MAX_BUYERS_PER_SUBMISSION,
  RFP_SERVICE_SUMMARY,
  RFP_TOOLS_DISCLAIMER,
} from "@/lib/rfp-legal";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Conditions générales de vente — ${SITE_NAME}`,
  description: "CGV SolarIndex — achat de leads et accès appels d'offres pour installateurs professionnels.",
};

export default function CgvPage() {
  return (
    <LegalPageShell title="Conditions générales de vente" updatedAt="1 août 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes CGV régissent la vente de services numériques payants proposés par {SITE_NAME}{" "}
          aux <strong>installateurs et professionnels acheteurs</strong> : accès à des fiches de leads
          automatisés (parkings APER) et accès aux coordonnées de projets déposés par des gestionnaires
          ou propriétaires privés («&nbsp;consultation installateurs&nbsp;», désignée commercialement
          «&nbsp;appel d&apos;offres&nbsp;» sur le site).
        </p>
        <p>
          Les conditions applicables aux <strong>déposants gratuits</strong> (gérants, propriétaires)
          figurent dans les{" "}
          <a href="/legal/cgu">Conditions générales d&apos;utilisation (CGU)</a>.
        </p>
      </section>

      <section>
        <h2>2. Produits et tarifs</h2>
        <ul>
          <li>
            Abonnement Accès plateforme : {PRIX_PLATEFORME_MENSUEL} € TTC / mois (catalogue leads hors
            premium, appels d&apos;offres publiés sur plateforme officielle).
          </li>
          <li>Lead automatisé premium : {PRIX_LEAD.premium} € TTC / fiche (achat unitaire).</li>
          <li>
            Accès installateur — consultation privée, projet &lt; 10 000 m² : {PRIX_RFP.sous_10000} €
            TTC.
          </li>
          <li>
            Accès installateur — consultation privée, projet ≥ 10 000 m² :{" "}
            {PRIX_RFP.a_partir_10000} € TTC.
          </li>
        </ul>
        <p>Les tarifs en vigueur sont ceux affichés sur le site au moment de la commande.</p>
      </section>

      <section>
        <h2>3. Commande et paiement</h2>
        <p>
          La commande est validée après paiement intégral via Stripe. Le déblocage de la fiche ou des
          coordonnées est immédiat dans «&nbsp;Mon espace&nbsp;». Aucun remboursement n&apos;est dû une
          fois l&apos;information délivrée, sauf erreur manifeste imputable à {SITE_NAME}.
        </p>
      </section>

      <section id="nature-du-service">
        <h2>4. Nature du service — accès à une information</h2>
        <p>
          <strong>{INSTALLER_PURCHASE_IS_INFORMATION_ONLY}</strong>
        </p>
        <p>
          Un lead automatisé est une fiche de prospection documentée (données B2B, parcelle, SIREN,
          etc.). Plusieurs installateurs peuvent acquérir le même lead automatisé (sans plafond) ; chacun
          ne peut le débloquer qu&apos;une fois. Un
          accès «&nbsp;appel d&apos;offres&nbsp;» est l&apos;accès aux coordonnées volontairement
          déposées par un gestionnaire ou propriétaire privé — {RFP_SERVICE_SUMMARY}
        </p>
        <p>{RFP_TOOLS_DISCLAIMER}</p>
        <p>
          {SITE_NAME} n&apos;intervient pas dans les négociations, devis ou contrats entre
          l&apos;installateur et le tiers contacté (exploitant, gérant, propriétaire).{" "}
          {SITE_NAME} n&apos;est <strong>pas partie</strong> au contrat final de travaux.
        </p>
      </section>

      <section id="non-performance">
        <h2>5. Absence de garantie de résultat commercial</h2>
        <p>
          <strong>{INSTALLER_NO_PERFORMANCE_CLAUSE}</strong>
        </p>
        <ul>
          <li>
            L&apos;absence de réponse du contact, de rendez-vous, de devis signé ou de chantier réalisé
            ne constitue pas un défaut de conformité du service vendu par {SITE_NAME}, dès lors que
            l&apos;accès à l&apos;information commandée a été effectivement fourni.
          </li>
          <li>
            Le client ne peut pas invoquer une «&nbsp;non-exécution&nbsp;» ou une «&nbsp;non-performance
            &nbsp;» au sens du Code civil ou du Code de la consommation pour reprocher à {SITE_NAME}{" "}
            l&apos;échec de sa prospection commerciale auprès du tiers.
          </li>
          <li>
            Le prix payé couvre exclusivement la mise à disposition de l&apos;information et des
            outils de la plateforme, pas un résultat économique.
          </li>
        </ul>
      </section>

      <section id="rfp-installateurs">
        <h2>6. Accès installateur aux dépôts de projets</h2>
        <p>L&apos;installateur qui achète l&apos;accès reconnaît que :</p>
        <ul>
          <li>Il achète des coordonnées et des éléments descriptifs, pas un marché attribué.</li>
          <li>
            Jusqu&apos;à {RFP_MAX_BUYERS_PER_SUBMISSION} installateurs peuvent accéder au même dépôt ;
            aucune exclusivité.
          </li>
          <li>
            Le déposant reste libre de retenir ou non sa proposition ; le déposant peut retirer son
            annonce (voir <a href="/legal/cgu#retrait-annonce">CGU §5</a>).
          </li>
          <li>
            Les articles 4 et 5 (nature du service, absence de garantie de résultat) s&apos;appliquent
            intégralement.
          </li>
          <li>
            Usage conforme au RGPD et à la prospection B2B, sans démarchage abusif.
          </li>
        </ul>
        <p>
          Aucun remboursement après déblocage des coordonnées, sauf erreur manifeste imputable à{" "}
          {SITE_NAME} (coordonnées manifestement invalides).
        </p>
      </section>

      <section id="rfp-deposants">
        <h2>7. Dépôts de projets (renvoi CGU)</h2>
        <p>
          Les gestionnaires et propriétaires qui déposent gratuitement un projet sont soumis aux{" "}
          <a href="/legal/cgu">Conditions générales d&apos;utilisation (CGU)</a> (absence de garantie
          de contact, non-partie au contrat final, retrait d&apos;annonce, suppression de compte).
        </p>
      </section>

      <section>
        <h2>8. Droit de rétractation</h2>
        <p>
          Contenu numérique fourni immédiatement après paiement : le client reconnaît renoncer à son
          droit de rétractation une fois la fiche ou les coordonnées débloquées (art. L221-28 du Code
          de la consommation, lorsque applicable selon son statut).
        </p>
      </section>

      <section>
        <h2>9. Litiges</h2>
        <p>
          Droit français. Tentative de résolution amiable par{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. À défaut, tribunaux compétents du
          siège social de l&apos;éditeur.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Les présentes CGV ne dispensent pas le client de se conformer aux lois applicables. En cas
          de doute, consultez un conseil juridique compétent.
        </p>
      </section>
    </LegalPageShell>
  );
}
