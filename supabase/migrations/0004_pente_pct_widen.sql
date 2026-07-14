-- Élargir pente_pct : certaines zones (relief extrême, données altimétriques
-- bruitées) produisent des valeurs > 999 % avant cap côté pipeline.
alter table leads alter column pente_pct type numeric(8,1);
