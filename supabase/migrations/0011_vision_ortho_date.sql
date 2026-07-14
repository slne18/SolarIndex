-- Date de prise de vue de l'orthophoto IGN analysée (GetFeatureInfo WMS).

alter table leads
  add column if not exists vision_ortho_date date;

comment on column leads.vision_ortho_date is
  'Date de vol / orthophoto IGN utilisée pour l''analyse vision (WMS HR.ORTHOIMAGERY).';
