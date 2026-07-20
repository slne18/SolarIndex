import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";
import { RFP_MAX_BUYERS_PER_SUBMISSION, RFP_SERVICE_SUMMARY, RFP_TOOLS_DISCLAIMER } from "@/lib/rfp-legal";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Conditions générales d'utilisation (déposants) — ${SITE_NAME}`,
  description:
    "CGU SolarIndex pour gérants et propriétaires — dépôt gratuit de projet parking, sans garantie de résultat.",
};

export default function CguPage() {
  return (
    <LegalPageShell title="Conditions générales d'utilisation — déposants" updatedAt="20 juillet 2026">
      <section>
        <h2>1. Objet et public concerné</h2>
        <p>
          Les présentes CGU s&apos;appliquent aux gestionnaires et propriétaires de parkings privés qui
          déposent gratuitement un projet sur {SITE_NAME} («&nbsp;déposant&nbsp;»). Elles complètent la{" "}
          <a href="/legal/confidentialite">Politique de confidentialité</a> et les{" "}
          <a href="/legal/cgv">CGV</a> applicables aux installateurs payants.
        </p>
        <p>{RFP_SERVICE_SUMMARY}</p>
      </section>

      <section>
        <h2>2. Ce que SolarIndex n&apos;est pas</h2>
        <ul>
          <li>
            {SITE_NAME} n&apos;est <strong>pas</strong> une plateforme de passation de marchés publics
            ni un support BOAMP.
          </li>
          <li>
            {SITE_NAME} n&apos;est <strong>pas</strong> partie au contrat final entre le déposant et un
            installateur (devis, marché de travaux, maintenance, financement, etc.).
          </li>
          <li>
            {SITE_NAME} n&apos;organise pas la sélection d&apos;un lauréat, ne négocie pas les prix et
            ne garantit aucun résultat économique, technique ou réglementaire.
          </li>
          <li>{RFP_TOOLS_DISCLAIMER}</li>
        </ul>
      </section>

      <section id="sans-garantie">
        <h2>3. Absence de garantie de résultat</h2>
        <p>
          Le dépôt est <strong>gratuit</strong>. En contrepartie, {SITE_NAME} ne garantit en aucun cas
          :
        </p>
        <ul>
          <li>
            qu&apos;un ou plusieurs installateurs contacteront le déposant, ni le nombre, la fréquence
            ou la rapidité des contacts ;
          </li>
          <li>
            la qualité, la pertinence, la conformité réglementaire ou la compétitivité des devis ou
            propositions commerciales reçus ;
          </li>
          <li>
            la conclusion d&apos;un contrat, la signature d&apos;un devis ou la réalisation d&apos;un
            chantier ;
          </li>
          <li>
            un gain financier, une éligibilité APER confirmée ou une autorisation d&apos;urbanisme.
          </li>
        </ul>
        <p>
          Le déposant reste seul responsable de la comparaison des offres, de la vérification des
          qualifications (RGE, assurances, références) et de la négociation contractuelle avec
          l&apos;installateur retenu.
        </p>
      </section>

      <section id="reference-officielle">
        <h2>4. Référencement vers consultations officielles</h2>
        <p>
          Le déposant peut, s&apos;il le souhaite, indiquer une <strong>URL publique</strong> vers une
          consultation déjà publiée sur une plateforme officielle (PLACE, AWS, Megalis, Maximilien,
          Marchés Online, etc.).
        </p>
        <ul>
          <li>
            {SITE_NAME} <strong>n&apos;héberge pas</strong> le dossier de consultation entreprises (DCE)
            et <strong>ne reproduit pas</strong> les documents officiels.
          </li>
          <li>
            {SITE_NAME} agit comme une <strong>plateforme de référencement</strong> et de mise en
            relation : l&apos;annuaire redirige vers la source officielle indiquée par le déposant.
          </li>
          <li>
            Les documents contractuels et pièces de marché restent consultables{" "}
            <strong>uniquement</strong> sur la plateforme officielle désignée.
          </li>
          <li>
            Le déposant garantit être <strong>habilité</strong> à publier cette référence et l&apos;exactitude
            de l&apos;URL communiquée.
          </li>
          <li>
            Les documents complémentaires optionnels (présentation, photos, étude) fournis par le
            déposant restent distincts du DCE officiel et ne se substituent pas à celui-ci.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Mise en relation et non-exclusivité</h2>
        <p>
          Jusqu&apos;à {RFP_MAX_BUYERS_PER_SUBMISSION} installateurs professionnels peuvent, moyennant
          paiement à {SITE_NAME}, débloquer les coordonnées volontairement transmises par le déposant.
          Le dépôt n&apos;est pas exclusif. {SITE_NAME} ne contrôle pas le contenu des échanges entre
          déposant et installateurs.
        </p>
      </section>

      <section id="retrait-annonce">
        <h2>6. Retrait de l&apos;annonce et suppression de compte</h2>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.1. Retrait volontaire</h3>
        <p>
          Le déposant connecté peut retirer son annonce à tout moment depuis «&nbsp;Mon espace&nbsp;»
          (section «&nbsp;Mes dépôts de projet&nbsp;») ou en écrivant à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> depuis l&apos;email du compte ou du
          contact déposé.
        </p>
        <ul>
          <li>
            Le retrait entraîne la <strong>disparition immédiate</strong> de l&apos;annonce du
            catalogue public (statut «&nbsp;retiré&nbsp;»).
          </li>
          <li>
            Les installateurs ayant <strong>déjà acheté l&apos;accès</strong> avant le retrait
            conservent les coordonnées qui leur ont été délivrées au moment de l&apos;achat ; le retrait
            n&apos;efface pas rétroactivement ces accès déjà payés.
          </li>
          <li>
            Aucun installateur ne peut acheter un accès après le retrait.
          </li>
        </ul>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.2. Retrait par SolarIndex</h3>
        <p>
          {SITE_NAME} peut refuser, suspendre ou retirer un dépôt sans indemnité (informations
          inexactes, personne publique, contenu illicite, non-respect des CGU, etc.).
        </p>

        <h3 className="mt-6 text-base font-semibold text-slate-800">6.3. Suppression de compte</h3>
        <p>
          Le déposant peut supprimer son compte depuis «&nbsp;Mon espace&nbsp;» en confirmant la
          suppression. Cette action :
        </p>
        <ul>
          <li>retire du catalogue les annonces encore actives ;</li>
          <li>anonymise les coordonnées de contact sur les dépôts passés ;</li>
          <li>supprime le compte d&apos;authentification et les données de profil associées ;</li>
          <li>
            ne supprime pas les preuves comptables des achats déjà réalisés par des installateurs
            (obligations légales de conservation).
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Obligations du déposant</h2>
        <ul>
          <li>Informations exactes et mises à jour.</li>
          <li>Habilitations suffisantes pour le projet (concession, DSP, etc.).</li>
          <li>Respect des lois applicables (urbanisme, APER, commande publique le cas échéant).</li>
          <li>Pas de personne publique via le formulaire en ligne (voir CGV pour le détail).</li>
        </ul>
      </section>

      <section>
        <h2>8. Données personnelles</h2>
        <p>
          Voir la <a href="/legal/confidentialite">Politique de confidentialité</a>. Droits RGPD :
          accès, rectification, effacement, opposition —{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ou suppression de compte en
          libre-service.
        </p>
      </section>

      <section>
        <h2>9. Litiges</h2>
        <p>
          Droit français. Contact amiable préalable :{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
