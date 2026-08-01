-- Type d'offre lors du déblocage d'un appel d'offres (Produit B).
alter table rfp_purchases
  add column if not exists type_offre text not null default 'devis_installation'
  check (type_offre in ('devis_installation', 'tiers_investissement'));

alter table rfp_purchases
  add column if not exists duree_contrat_ans integer
  check (duree_contrat_ans is null or (duree_contrat_ans >= 1 and duree_contrat_ans <= 40));
