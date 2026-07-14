-- Photo > 45 % de couverture panneaux → parking équipé (hors catalogue).
UPDATE leads
SET detection = 'equipe'
WHERE vision_surface_couverte_pct > 45
  AND detection IS DISTINCT FROM 'equipe';
