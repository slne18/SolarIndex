import { CONTACT_EMAIL, SITE_NAME } from "./site";

/** Nombre max d'installateurs pouvant débloquer un même dépôt (aligné migration 0016). */
export const RFP_MAX_BUYERS_PER_SUBMISSION = 5;

export const RFP_LEGAL_LABEL =
  "Consultation installateurs · mise en relation commerciale (hors marchés publics)";

export const RFP_PUBLIC_ENTITY_BLOCK_MESSAGE =
  "Les personnes publiques et établissements soumis au Code de la commande publique ne peuvent pas déposer de projet via SolarIndex. Une procédure formalisée (publicité, critères, délais, recours) est en principe requise. Contactez votre service des marchés publics ou écrivez-nous pour toute question.";

export const RFP_SERVICE_SUMMARY = `${SITE_NAME} met en relation des gestionnaires ou propriétaires de parkings privés avec des installateurs photovoltaïques professionnels. Il ne s'agit pas d'un appel d'offres au sens du Code de la commande publique, ni d'une plateforme de passation de marchés publics.`;

export const RFP_DEPOSANT_CHECKLIST: readonly { id: string; label: string }[] = [
  {
    id: "comparer_devis",
    label:
      "Je comparerai plusieurs propositions commerciales et ne retiendrai pas le premier installateur sans analyse (prix, garanties, délais, références).",
  },
  {
    id: "qualifications",
    label:
      "Je vérifierai les qualifications de l'installateur retenu (RGE le cas échéant, assurances décennale et responsabilité civile, certifications ombrières/photovoltaïque).",
  },
  {
    id: "urbanisme",
    label:
      "Je m'informe sur les autorisations d'urbanisme éventuelles (permis de construire, déclaration préalable) et les contraintes patrimoniales (ABF), indépendamment de SolarIndex.",
  },
  {
    id: "aper",
    label:
      "Les outils SolarIndex (simulateur, vérificateur d'éligibilité APER) sont indicatifs : seules les décisions administratives ou juridiques compétentes font foi (dérogations, conformité APER).",
  },
  {
    id: "concession",
    label:
      "Si le parking est en concession ou délégation de service public, je confirme être habilité à lancer cette démarche et avoir vérifié les clauses contractuelles applicables.",
  },
] as const;

export type RfpDeposantChecklistId = (typeof RFP_DEPOSANT_CHECKLIST)[number]["id"];

export const RFP_DEPOSANT_DECLARATIONS = {
  non_marche_public: {
    id: "acceptation_non_marche_public",
    label: `Je confirme ne pas être une personne publique ou un établissement soumis au Code de la commande publique pour ce projet, ou que ce dépôt ne vise pas à remplacer une procédure de marché public.`,
  },
  mise_en_relation: {
    id: "acceptation_mise_en_relation",
    label: `Je comprends que ${SITE_NAME} organise une mise en relation commerciale privée : ce dépôt n'est pas publié au BOAMP ni soumis aux règles des marchés publics.`,
  },
  multi_installateurs: {
    id: "acceptation_multi_installateurs",
    label: `J'accepte que jusqu'à ${RFP_MAX_BUYERS_PER_SUBMISSION} installateurs professionnels, après paiement à ${SITE_NAME}, puissent accéder à mes coordonnées et me contacter pour une proposition commerciale.`,
  },
  exactitude: {
    id: "acceptation_exactitude",
    label:
      "Je garantis l'exactitude des informations transmises et disposer des droits nécessaires pour communiquer les données du projet.",
  },
  sans_garantie: {
    id: "acceptation_sans_garantie",
    label: `${SITE_NAME} modère les dépôts mais ne garantit ni la sélection d'un installateur, ni la conclusion d'un contrat de travaux, ni un résultat économique ou réglementaire.`,
  },
  cgv: {
    id: "acceptation_cgv_deposant",
    label: "J'ai lu et j'accepte les conditions applicables aux dépôts de projets (CGV, section 6).",
  },
  rgpd: {
    id: "consentement_rgpd",
    label: `J'accepte que mes coordonnées professionnelles soient communiquées aux installateurs solaires qui achètent l'accès à cette demande, conformément à la Politique de confidentialité.`,
  },
} as const;

export const RFP_INSTALLER_NOTICE = `${SITE_NAME} commercialise l'accès aux coordonnées volontairement déposées par un gestionnaire ou propriétaire. Ce n'est pas un marché public attribué. Le déposant reste libre de choisir son installateur ; plusieurs professionnels peuvent accéder au même dépôt.`;

export const RFP_TOOLS_DISCLAIMER =
  "Les estimations, scores d'éligibilité APER et simulateurs sont fournis à titre indicatif et ne constituent ni un audit réglementaire, ni un conseil juridique, urbanistique ou fiscal.";

export interface RfpDeposantDeclarationsInput {
  est_personne_publique?: boolean;
  acceptation_non_marche_public?: boolean;
  acceptation_mise_en_relation?: boolean;
  acceptation_multi_installateurs?: boolean;
  acceptation_exactitude?: boolean;
  acceptation_sans_garantie?: boolean;
  acceptation_cgv_deposant?: boolean;
  consentement_rgpd?: boolean;
  checklist?: Partial<Record<RfpDeposantChecklistId, boolean>>;
}

export function validateRfpDeposantDeclarations(
  input: RfpDeposantDeclarationsInput,
): { ok: true } | { ok: false; error: string } {
  if (input.est_personne_publique) {
    return {
      ok: false,
      error: RFP_PUBLIC_ENTITY_BLOCK_MESSAGE,
    };
  }

  const requiredFlags: (keyof RfpDeposantDeclarationsInput)[] = [
    "acceptation_non_marche_public",
    "acceptation_mise_en_relation",
    "acceptation_multi_installateurs",
    "acceptation_exactitude",
    "acceptation_sans_garantie",
    "acceptation_cgv_deposant",
    "consentement_rgpd",
  ];

  for (const key of requiredFlags) {
    if (!input[key]) {
      return { ok: false, error: "Toutes les déclarations et consentements sont requis." };
    }
  }

  for (const item of RFP_DEPOSANT_CHECKLIST) {
    if (!input.checklist?.[item.id]) {
      return { ok: false, error: "Veuillez confirmer chaque point de la checklist déposant." };
    }
  }

  return { ok: true };
}

export function rfpPublicEntityMailto(): string {
  const subject = encodeURIComponent("Question dépôt projet — personne publique");
  const body = encodeURIComponent(
    `Bonjour,\n\nJe représente une structure publique et souhaite des informations sur SolarIndex.\n\nStructure :\nProjet :\n\nMerci.`,
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
