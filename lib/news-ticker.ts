export interface NewsTickerItem {
  source: string;
  headline: string;
  excerpt: string;
  url: string;
  /** Illustration article (og:image) — optionnel selon la source */
  imageUrl?: string;
  imageAlt?: string;
}

/** Illustration par défaut — jamais la photo hero de la page d'accueil. */
export const NEWS_FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Parking_ombri%C3%A8res_Photovolta%C3%AFque.jpg/960px-Parking_ombri%C3%A8res_Photovolta%C3%AFque.jpg";
export const NEWS_FALLBACK_IMAGE_ALT =
  "Parking équipé d'ombrières photovoltaïques — illustration";

const HERO_HOME_IMAGE = "/images/hero-home.png";

export function resolveNewsImage(item: NewsTickerItem): { url: string; alt: string } {
  const candidate = item.imageUrl ?? NEWS_FALLBACK_IMAGE;
  const url = candidate === HERO_HOME_IMAGE ? NEWS_FALLBACK_IMAGE : candidate;
  return {
    url,
    alt: item.imageAlt ?? NEWS_FALLBACK_IMAGE_ALT,
  };
}

/** Actualités APER / ombrières — sources presse (liens externes).
 *  Chaque entrée doit avoir une imageUrl distincte (jamais /images/hero-home.png). */
export const NEWS_TICKER_ITEMS: NewsTickerItem[] = [
  {
    source: "L'Echo du Solaire",
    headline:
      "Échéance loi APER dépassée : seuls 10 à 15 % des grands parkings seraient conformes",
    excerpt:
      "L'échéance du 1er juillet 2026 est passée, mais la solarisation des grands parkings est loin d'être au rendez-vous. La filière estime que seuls 10 à 15 % des sites concernés sont en règle, sous peine d'une amende pouvant atteindre 40 000 € par an et par site.",
    url: "https://www.lechodusolaire.fr/ombrieres-de-parkings-la-premiere-echeance-de-la-loi-aper-depassee-la-conformite-reste-tres-faible/",
    imageUrl:
      "https://www.lechodusolaire.fr/wp-content/uploads/2026/07/OmbriereGirasole.jpg",
    imageAlt: "Ombrière photovoltaïque sur un grand parking",
  },
  {
    source: "Révolution Énergétique",
    headline:
      "Ombrières photovoltaïques : un dixième des grands parkings équipés, amendes jusqu'à 40 000 €",
    excerpt:
      "Au 1er juillet, les grands parkings devaient être équipés d'ombrières photovoltaïques — mais seulement un dixième le serait aujourd'hui. Une situation qui pourrait engendrer des amendes pouvant atteindre 40 000 € par an.",
    url: "https://www.revolution-energetique.com/actus/les-ombrieres-photovoltaiques-sur-pakings-ne-sont-pas-aussi-nombreuses-que-prevu/",
    imageUrl:
      "https://cdn.revolution-energetique.com/uploads/2026/07/solaire-parking-bilanol.jpg",
    imageAlt: "Parking équipé d'ombrières solaires",
  },
  {
    source: "Les Echos",
    headline:
      "Panneaux solaires sur les parkings : pas de délai de grâce pour la grande distribution",
    excerpt:
      "Malgré les demandes de report de la FCD, le gouvernement maintient le calendrier APER : la grande distribution ne bénéficiera pas d'un délai de grâce pour équiper ses parkings de panneaux solaires.",
    url: "https://www.lesechos.fr/industrie-services/conso-distribution/panneaux-solaires-sur-les-parkings-pas-de-delai-de-grace-pour-la-grande-distribution-2131963",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Solar_panel_carpark.jpg/960px-Solar_panel_carpark.jpg",
    imageAlt: "Parking de grande distribution avec ombrières solaires",
  },
  {
    source: "Le Monde",
    headline:
      "Canicule : les ombrières solaires gagnent du terrain sur les parkings privés et publics",
    excerpt:
      "Face aux canicules, les ombrières solaires se multiplient sur les parkings privés et publics — production d'énergie et ombre pour les automobilistes dans le même geste.",
    url: "https://www.lemonde.fr/planete/article/2023/08/24/canicule-les-ombrieres-solaires-gagnent-du-terrain-sur-les-parkings-prives-et-publics_6186458_3244.html",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Solar_carports_at_Google%27s_Mountain_View_offices.jpg/960px-Solar_carports_at_Google%27s_Mountain_View_offices.jpg",
    imageAlt: "Ombrières solaires sur un grand parking",
  },
  {
    source: "Le Moniteur",
    headline:
      "Solarisation des parkings : seule une fraction minoritaire des surfaces de plus de 10 000 m² sera prête au 1er juillet",
    excerpt:
      "Environ 11 000 parkings extérieurs de plus de 10 000 m² devaient être couverts d'ombrières photovoltaïques au 1er juillet 2026. Les indicateurs convergent : la fraction réellement conforme sera très minoritaire.",
    url: "https://www.lemoniteur.fr/produits-et-materiels/photovoltaique/solarisation-des-parkings-seule-une-fraction-minoritaire-des-surfaces-de-plus-de-10-000-m2-sera-prete-au-1er-juillet.HSVI3HXVYFC2BNWJZ6UEUNTFZ4.html",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Parking_solar_%C3%A0_Grenoble.JPG/960px-Parking_solar_%C3%A0_Grenoble.JPG",
    imageAlt: "Parking solarisé en France",
  },
];
