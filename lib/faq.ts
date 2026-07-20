export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "lead-definition",
    question: "Qu'est-ce qu'un lead SolarIndex ?",
    answer:
      "Un lead est une fiche de prospection B2B : parking soumis à l'obligation d'ombrières photovoltaïques (loi APER), enrichi avec l'exploitant (SIREN), le propriétaire foncier lorsque identifié, la parcelle cadastrale et les coordonnées GPS. Ce n'est pas un chantier signé, mais un signal qualifié pour votre prospection commerciale.",
  },
  {
    id: "products",
    question: "Quelle différence entre leads automatisés et consultation installateurs ?",
    answer:
      "Les leads automatisés sont détectés et enrichis par nos outils (OpenStreetMap, cadastre, SIREN, MAJIC). Les « appels d'offres » du site sont en réalité des projets déposés volontairement par un gérant ou propriétaire privé via notre formulaire : c'est une mise en relation commerciale, pas une procédure de marché public. Les installateurs achètent l'accès à vos coordonnées volontairement communiquées.",
  },
  {
    id: "lead-content",
    question: "Que contient une fiche lead après achat ?",
    answer:
      "Surface, localisation, indice de confiance, exploitant (SIREN et raison sociale), dirigeants lorsque identifiés via open data, propriétaire foncier MAJIC, adresse, parcelle cadastrale et coordonnées GPS. Pas de canal direct (téléphone ou email) : vous prospectez via l'identité légale et la localisation exacte.",
  },
  {
    id: "exclusivity",
    question: "Un lead est-il exclusif ?",
    answer:
      "Non. Chaque lead automatisé peut être acheté par jusqu'à 3 installateurs. Les appels d'offres peuvent également être consultés par plusieurs professionnels selon les règles affichées sur la fiche.",
  },
  {
    id: "payment",
    question: "Comment payer et recevoir mes leads ?",
    answer:
      "Paiement sécurisé par Stripe (carte bancaire). La fiche est débloquée immédiatement dans Mon espace. Un email de confirmation peut être envoyé si la messagerie transactionnelle est configurée. Le Pack Territoire permet de consommer des crédits inclus à la place d'un paiement unitaire.",
  },
  {
    id: "guarantee",
    question: "Comment fonctionne la garantie de remplacement ?",
    answer:
      "Pour les leads automatisés : remplacement gratuit si le parking est déjà recouvert à plus de 50 % d'ombrières photovoltaïques (obligation APER considérée comme satisfaite). Contactez-nous sous 48 h avec la preuve (photo, registre, etc.).",
  },
  {
    id: "rfp-deposit",
    question: "Comment déposer un projet parking (consultation installateurs) ?",
    answer:
      "Créez un compte (acteurs privés uniquement), puis utilisez le formulaire « Déposer un projet ». Vous confirmez que vous n'êtes pas une personne publique soumise au Code de la commande publique. Votre demande est vérifiée par email puis modérée. Jusqu'à 5 installateurs peuvent acheter l'accès à vos coordonnées pour vous proposer un devis — vous restez libre de choisir.",
  },
  {
    id: "rfp-legal",
    question: "SolarIndex remplace-t-il un appel d'offres public ?",
    answer:
      "Non. SolarIndex organise une mise en relation commerciale privée entre gestionnaires de parkings et installateurs solaires. Ce n'est pas une plateforme BOAMP, ni une procédure de marchés publics. Les collectivités et établissements publics ne peuvent pas déposer via notre formulaire. Les simulateurs et vérificateurs APER sont indicatifs et ne remplacent pas un avis administratif ou juridique.",
  },
  {
    id: "data-sources",
    question: "Sur quelles sources s'appuie SolarIndex ?",
    answer:
      "Données publiques et open data : OpenStreetMap, cadastre (Etalab/IGN), répertoire SIREN, fichiers MAJIC pour les propriétaires fonciers, registre photovoltaïque lorsque pertinent. Les inférences sont documentées via un indice de confiance.",
  },
  {
    id: "gdpr",
    question: "SolarIndex est-il conforme au RGPD ?",
    answer:
      "SolarIndex cible exclusivement des personnes morales et des données B2B. Le traitement repose notamment sur l'intérêt légitime de prospection B2B. La mesure d'audience utilise Plausible (sans cookies publicitaires). Vos droits (accès, rectification, effacement, etc.) s'exercent surtout sur votre compte installateur ou vos dépôts d'appels d'offres — voir la Politique de confidentialité, section 6.",
  },
  {
    id: "account",
    question: "Puis-je supprimer mon compte ou mes données ?",
    answer:
      "Oui. Depuis Mon espace, vous pouvez retirer vos annonces de projet et supprimer définitivement votre compte (confirmation requise). Vous pouvez aussi écrire à contact@solarindex.fr. Les preuves comptables des achats passés peuvent être conservées anonymisées conformément à la Politique de confidentialité.",
  },
];
