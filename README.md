# SolarIndex

Marketplace B2B de leads solaires (loi APER) — application Next.js, Supabase, Stripe.

## Démarrage rapide

```bash
cp .env.local.example .env.local   # puis remplir les clés
npm install
npm run dev
```

Tests : `npm test`

## Structure du dépôt

| Dossier / fichier | Rôle |
|-------------------|------|
| `app/` | Routes Next.js (pages, API) |
| `components/` | UI React |
| `lib/` | Logique métier, Stripe, i18n, accès plateforme |
| `supabase/migrations/` | Schéma Postgres |
| `tests/` | Vitest |
| `scripts/` | Ingestion CSV Node, chargement France, boucles backfill |
| `pipeline/` | Python OSM → CSV, lib métier, backfills ([index](./pipeline/README.md)) |
| `docs/` | Specs et instructions Cursor ([index](./docs/README.md)) |
| `data/samples/` | CSV d’exemple (`leads_gironde.csv`) |
| `data/cache/` | Cache pipeline (ignoré par git) |

App Next.js : sections ci-dessus. **Pipeline Python** (commandes, backfills) : [pipeline/README.md](./pipeline/README.md). Spec complète : [docs/SOLARINDEX.md](./docs/SOLARINDEX.md).
