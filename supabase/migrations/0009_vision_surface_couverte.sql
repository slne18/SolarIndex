-- Bypass 4 : % de surface couverte estimé par la vision (orthophoto + Claude).

alter table leads
  add column if not exists vision_surface_couverte_pct numeric(5, 1);

comment on column leads.vision_surface_couverte_pct is
  'Part de la surface parking couverte par des ombrières (0–100), estimée sur orthophoto IGN.';
