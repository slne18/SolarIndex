export interface NewsTickerItem {
  source: string;
  headline: string;
  url: string;
}

/** Actualités APER / ombrières — sources presse (liens externes). */
export const NEWS_TICKER_ITEMS: NewsTickerItem[] = [
  {
    source: "L'Echo du Solaire",
    headline:
      "Échéance loi APER dépassée : seuls 10 à 15 % des grands parkings seraient conformes",
    url: "https://www.lechodusolaire.fr/ombrieres-de-parkings-la-premiere-echeance-de-la-loi-aper-depassee-la-conformite-reste-tres-faible/",
  },
  {
    source: "Révolution Énergétique",
    headline:
      "Ombrières photovoltaïques : un dixième des grands parkings équipés, amendes jusqu'à 40 000 €",
    url: "https://www.revolution-energetique.com/actus/les-ombrieres-photovoltaiques-sur-pakings-ne-sont-pas-aussi-nombreuses-que-prevu/",
  },
  {
    source: "Les Echos",
    headline:
      "Panneaux solaires sur les parkings : pas de délai de grâce pour la grande distribution",
    url: "https://www.lesechos.fr/industrie-services/conso-distribution/panneaux-solaires-sur-les-parkings-pas-de-delai-de-grace-pour-la-grande-distribution-2131963",
  },
  {
    source: "Le Monde",
    headline:
      "Canicule : les ombrières solaires gagnent du terrain sur les parkings privés et publics",
    url: "https://www.lemonde.fr/planete/article/2023/08/24/canicule-les-ombrieres-solaires-gagnent-du-terrain-sur-les-parkings-prives-et-publics_6186458_3244.html",
  },
];
