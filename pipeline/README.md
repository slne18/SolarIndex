# Pipeline Python SolarIndex

Extraction OSM, enrichissement B2B, backfills Supabase.

| Chemin | Rôle |
|--------|------|
| `solarindex_pipeline.py` | Point d’entrée principal (département → CSV ou ingest) |
| `lib/` | Modules métier Python (MAJIC, sellable, SIRENE, seuils surface) |
| `scripts/` | Backfills et chargement MAJIC |
| `tests/` | Tests `unittest` Python |
| `paths.py` | `REPO_ROOT`, `PIPELINE_ROOT`, bootstrap `sys.path` |

Depuis la **racine du repo** (`.env.local` à la racine) :

```bash
python pipeline/solarindex_pipeline.py --dept 33 --output data/samples/leads_gironde.csv
.venv/bin/python pipeline/scripts/backfill_bypasses.py --mode proprietaire --limit 10
python -m unittest discover -s pipeline/tests -p 'test_*.py'
```
