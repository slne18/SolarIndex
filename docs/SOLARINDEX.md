# SolarIndex — Guide développeur & produit

Document **unique** pour Cursor et l’équipe : contexte métier, spec UI/API, pipeline Python, bypasses.

**Sources de vérité à jour** (prioritaires sur ce doc si divergence) :

- Schéma BDD : `supabase/migrations/`
- Tarifs & accès : `lib/platform-access.ts`, `lib/leads.ts`, `lib/lead-confidence.ts`
- Paiements : `lib/stripe.ts`, `app/api/checkout/`, `app/api/platform-subscribe/`
- Pipeline : `pipeline/README.md`, `docs/PIPELINE_BYPASSES_SPEC.md`

---

## 0. Règles de travail (agent Cursor)

Autorisation **totale et permanente** pour exécuter, installer, créer des fichiers, lancer des serveurs, appeler des API, écrire en base, commiter. Ne pas demander la permission avant d’agir : agir, montrer le résultat, continuer. En cas d’échec, corriger et relancer. À remonter uniquement : décisions d’architecture non triviales ou blocages réels (clé API manquante, quota dépassé).

---

## 1. Contexte métier

**SolarIndex** est une marketplace B2B de leads solaires pilotée par la **loi APER** (2023-175) : parkings extérieurs existants **≥ 1 500 m²** → obligation d’équiper **≥ 50 %** en ombrières PV, sous peine d’amendes (jusqu’à **40 000 €/an**). Le produit détecte les parkings concernés (OpenStreetMap + enrichissement), identifie l’exploitant / propriétaire, et vend l’accès aux installateurs PME.

Personas : **installateur** (acheteur de leads, AO), **propriétaire / gestionnaire** (dépôt de projet, simulateur, vérification).

---

## 2. État actuel du produit

Les **phases A–F** (backend, Stripe, vitrine, auth, admin, ingest pipeline) sont **livrées**. Évolutions majeures post-spec initiale :

| Sujet | Comportement actuel |
|--------|---------------------|
| **Abonnement plateforme** | **300 €/mois** (1er mois **240 €** avec coupon Stripe) — catalogue leads **standard** + appels d’offres **publics** |
| **Lead premium** | **50 €/lead** — photo vérifiée (`vision_checked_at`) + fiche **< 6 mois** |
| **Lead standard** | Inclus dans l’abonnement (déblocage sans paiement unitaire si abonné actif) |
| **AO privés** | Tarifs dédiés (400 / 550 € selon type) |
| **Garantie remplacement** | **Retirée** (UI, CGV, emails) |
| **i18n** | FR / EN (`lib/i18n/`) |
| **Espace client** | `MonEspaceClient`, abonnement plateforme, achats RFP |
| **Stats tarifs home** | % catalogue débloqué via `GET /api/pricing-stats` |

Ne pas réimplémenter l’ancienne grille **80 € / 150 € / pack territoire 400 €** comme modèle principal — voir le code et la home pour la présentation actuelle.

---

## 3. Stack technique

```
Frontend     : Next.js 14 (App Router) + Tailwind CSS
Backend      : Next.js API Routes (serverless, Vercel)
Base         : Supabase (PostgreSQL + Auth + Storage)
Paiements    : Stripe (Checkout, abonnements, webhooks)
Emails       : Resend
Analytics    : Plausible (sans cookies invasifs)
Pipeline     : Python dans pipeline/ → CSV et/ou POST /api/ingest
```

### Variables d’environnement (`.env.local`)

Voir `.env.local.example` pour la liste complète. Principales :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PLATFORM_PRICE_ID=
STRIPE_PLATFORM_INTRO_COUPON_ID=
RESEND_API_KEY=
RESEND_FROM=
ADMIN_SECRET_TOKEN=
PIPELINE_INGEST_TOKEN=
PAPPERS_API_TOKEN=          # pipeline / enrichissement
NEXT_PUBLIC_URL=
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
```

---

## 4. Base de données (aperçu)

Le schéma réel évolue par migrations (`0013` MAJIC, `0027` FAQ, `0030` SIRENE, `0031` RFP adresse, `0032` `platform_subscriptions`, etc.). Résumé des tables cœur :

### `leads`

Géographie OSM, surfaces, classification PV, enrichissement B2B, score, statut commercial (`disponible` | `vendu` | …), `prix_lead_eur` (centimes), champs bypass (parcelle, MAJIC, vision, pente, …).

Index fréquents : `(departement, statut)`, `(flag_urgence, statut)`, `(region, statut)`, `(classification, statut)`.

**Classification ombrières (OSM)** : `equipe` (overlap ≥ 50 %) → **hors catalogue public** ; `a_verifier` (5–50 %) ; `libre` (< 5 %).

**ODRÉ** : plus utilisé pour classifier ; `pv_registry_count` informatif seulement.

### `purchases`, `profiles`, `platform_subscriptions`

Achats unitaires, profil installateur (`plan`, `stripe_customer_id`, …), abonnement plateforme (Stripe subscription id, période, statut).

### RLS

RLS filtre les **lignes** ; le **masquage des colonnes** sensibles (`siren`, `dirigeant`, coordonnées, etc.) se fait dans les **API Routes** sauf si `acheteur_id = user.id` (ou règles admin).

---

## 5. Arborescence du repo

```
app/                    # Pages & API Next.js
components/
lib/                    # TypeScript métier (pas de Python ici)
pipeline/
  solarindex_pipeline.py
  lib/                  # modules Python
  scripts/              # backfills, MAJIC
  tests/
scripts/                # ingest CSV (Node), load_france*.sh
supabase/migrations/
tests/                  # Vitest (TS)
docs/
  SOLARINDEX.md         # ce fichier
  PIPELINE_BYPASSES_SPEC.md
data/samples/           # CSV d’exemple
```

Entrée pipeline : `python pipeline/solarindex_pipeline.py` (depuis la racine du repo).

---

## 6. Site vitrine — `/`

Sections (scroll vertical), contenu i18n :

**6.1 Hero** — Loi APER, H1, CTA installateur / propriétaire, chiffres clés (~85k parkings, amende, €/kWc).

**6.2 Fonctionnement** — 3 étapes : extraction OSM → enrichissement B2B → lead / accès plateforme.

**6.3 Simulateur** — `<SolarSimulator />` (section 8).

**6.4 Exemple de lead** — fiche mockée, champs sensibles floutés.

**6.5 Avantages** — exclusivité, données vérifiables, volume APER, B2B RGPD.

**6.6 Tarifs** — **alignés sur le code** : carte abonnement plateforme (300 €/mois, intro −20 %), lead premium (50 €), AO ; stats dynamiques (% débloqué). Pas de garantie remplacement.

**6.7 Footer** — légal, sources OSM / open data, RGPD.

---

## 7. Catalogue leads — `/leads`

### Filtres

Région, département, surface min, flag urgence, NAF, tri (valeur / surface / date).

### Tableau

Flag | Ville (dépt) | Surface | kWc | Valeur | NAF | Score | Statut | Action.

- `disponible` → achat ou déblocage (selon abonnement / premium)
- `vendu` → grisé
- lead de l’utilisateur → « Votre lead »
- `equipe` → **non listé** publiquement
- `a_verifier` → badge visible, vendable selon règles métier

### API `GET /api/leads`

Champs publics : id, geo agrégée, surfaces, kWc, valeur, NAF, score, statut, prix affiché.

Champs sensibles **uniquement** si lead acheté / débloqué pour l’utilisateur : siren, raison sociale, dirigeant, tel, email, adresse, parcelle, lat/lon.

Pagination ~20, `range()` Supabase.

---

## 8. Composant `SolarSimulator`

```tsx
interface SolarSimulatorProps {
  initialSurface?: number   // défaut ~12000
  locked?: boolean
  surfaceFromLead?: number
}
```

Formules (alignées `pipeline/solarindex_pipeline.py`) :

```typescript
const surfaceSolaire = surface * 0.50
const puissanceKwc   = Math.round(surfaceSolaire / 5)
const valeurChantier = puissanceKwc * 1200
const isUrgence      = surface >= 10000
```

UI : slider 1 500–80 000 m², 3 cartes résultat, flag urgence si ≥ 10 000 m². Format `toLocaleString('fr-FR')`.

---

## 9. Fiche lead — `/leads/[id]`

1. **Non acheté** — données partielles, sensibles floutés (`blur`), simulateur `locked`, CTA checkout.
2. **Acheté par l’user** — tout débloqué, date d’achat, export PDF si prévu.
3. **Vendu à un autre** — badge vendu, pas d’achat.

---

## 10. Paiements Stripe

### Abonnement plateforme

`POST /api/platform-subscribe` → Checkout **mode subscription** (`STRIPE_PLATFORM_PRICE_ID`, coupon intro optionnel). Webhook → table `platform_subscriptions`, profil `plan=platform`.

### Lead / RFP

`POST /api/checkout` — vérifier auth, statut lead, **abonnement actif** pour lead standard (sinon 402 `requiresPlatform`), premium → paiement unitaire. Metadata `leadId`, `userId`.

`POST /api/rfp/checkout` — logique analogue pour AO (public gratuit si abonné).

### Webhook `checkout.session.completed`

Transaction : lead `vendu` / fulfillment, `purchases`, email Resend (`lib/fulfillment.ts`, `lib/email.ts`).

Détails montants : `lib/stripe.ts`, `prixLeadCentimes`, tiers premium.

---

## 11. Email de livraison (Resend)

Après paiement / fulfillment : sujet `Votre lead SolarIndex — [Ville] ([Dépt]) · [Surface] m²`, HTML avec tableau des champs débloqués, lien espace client, pièce CSV mono-ligne. **Sans** clause garantie remplacement.

---

## 12. Admin — `/admin`

Token `ADMIN_SECRET_TOKEN` ou profil admin. Double panneau : leads (filtres, export CSV, ajout manuel) + clients par région. Matching : clic lead → surbrillance clients dont `departements` contient le département ; notification email optionnelle. Bandeau stats (volume, CA, clients).

---

## 13. Ingestion pipeline — `POST /api/ingest`

Header `Authorization: Bearer {PIPELINE_INGEST_TOKEN}`.

Body : tableau de leads (format pipeline). Upsert sur `osm_id`, ne pas écraser un lead **`vendu`**, calcul `region` depuis département, prix / champs calculés. Réponse `{ inserted, updated, skipped }`.

Mapping département → région : `lib/` (ex. scripts ingest, `DEPT_REGION`).

Le pipeline peut exporter CSV **ou** appeler cet endpoint en production.

---

## 14. Authentification

Supabase Auth (email / mot de passe). Trigger profil à l’inscription. Routes protégées : espace client, checkout. Confirmation email via Resend (`/api/auth/signup`).

---

## 15. Composant `LeadCard`

```tsx
interface LeadCardProps {
  lead: Lead
  variant: 'list' | 'detail' | 'admin'
  isOwned: boolean
  onBuy?: () => void
}
```

Variants list / detail / admin (données et actions selon contexte).

---

## 16. Pipeline Python (`pipeline/solarindex_pipeline.py`)

1. Overpass → parkings `amenity=parking` + surfaces asphalt/concrete/paved
2. Surface géodésique Lambert-93 (Shapely)
3. Filtre ≥ 1 500 m², `URGENCE_ABSOLUE` si ≥ 10 000 m²
4. PV OSM : overlap géométrique → `equipe` / `a_verifier` / `libre`
5. Enrichissement : BAN, cadastre, SIREN, NAF cibles, exclusion publique (cat. juridiques 7/4)
6. Valorisation : ×0,50 solaire, 5 m²/kWc, 1 200 €/kWc
7. CSV et/ou ingest API

Constantes :

```python
SURFACE_MIN_M2      = 1_500
SURFACE_URGENCE_M2  = 10_000
RATIO_SOLAIRE       = 0.50
M2_PAR_KWC          = 5
COUT_KWC_EUR        = 1_200
PV_OVERLAP_MIN      = 0.05
PV_OVERLAP_EQUIPE   = 0.50
```

Scripts de maintenance : `pipeline/scripts/backfill_*.py`, `load_majic_parquet.py`. Spec bypasses détaillée : **`PIPELINE_BYPASSES_SPEC.md`**.

---

## 17. Améliorations pipeline (roadmap / partiellement faites)

À traiter dans `pipeline/solarindex_pipeline.py` et backfills ; ordre et cas limites dans **`PIPELINE_BYPASSES_SPEC.md`**.

1. **Élargissement OSM** — requête sans tag `surface`, champ `surface_tag_present`
2. **Surface cadastrale** — WFS IGN, `surface_cadastrale_m2` fait foi pour APER
3. **Propriétaire foncier** — MAJIC / Pappers, `siren_proprietaire`, etc.
4. **Vision ombrières** — BD ORTHO + Haiku sur urgences `libre` → `vision_checked_at`, premium
5. **Dérogations** — pente (IGN elevation), ABF — flags informatifs, pénalité score (`lib/huwart-law.ts`)

---

## 18. Historique d’implémentation (bootstrap)

```
Phase A — Backend        ✓ Supabase, ingest, API leads
Phase B — Paiement       ✓ Checkout, webhooks, Resend
Phase C — Frontend       ✓ Landing, /leads, fiche, simulateur, success
Phase D — Auth / espace  ✓ Login, mon espace
Phase E — Admin          ✓ Dashboard, matching, export
Phase F — Pipeline       ✓ Ingest / CSV, dossier pipeline/
```

Suite : abonnement plateforme, premium, RFP, FAQ, i18n — voir migrations et commits récents.

---

## 19. RGPD

- Leads **personnes morales** — intérêt légitime B2B (art. 6.1.f).
- Mentions site : sources (OSM, open data, APIs entreprises) + opposition.
- Analytics : Plausible configuré pour limiter les cookies.
- Rétention : politique confidentialité / CGV (durée max documentée côté légal).
