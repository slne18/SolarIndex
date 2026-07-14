# SolarIndex — Instructions Cursor

## Règle de travail absolue
Tu as **autorisation totale et permanente** pour exécuter, installer, créer des fichiers, lancer des serveurs, appeler des API, écrire en base, commiter. Tu ne demandes jamais la permission avant d'agir. Tu agis, tu montres le résultat, tu continues. Si quelque chose échoue, tu corriges seul et tu relances. La seule chose que tu rapportes : les décisions d'architecture non triviales ou les blocages réels (clé API manquante, quota dépassé).

---

## Contexte du projet

**SolarIndex** est un pipeline B2B de génération de leads solaires piloté par la loi APER (2023-175). Cette loi oblige tous les parkings extérieurs existants de plus de 1 500 m² à équiper au moins 50 % de leur surface en ombrières photovoltaïques, sous peine d'amendes jusqu'à 40 000 €/an. SolarIndex détecte ces parkings non conformes, calcule leur potentiel commercial, identifie leur propriétaire, et vend ces leads exclusivement à des installateurs solaires PME.

---

## Ce qui existe déjà

### `solarindex_pipeline.py`
Script Python complet et fonctionnel. Il fait :
1. Requête Overpass API → extraction polygones `amenity=parking` + `surface=asphalt/concrete/paved` pour un département OSM
2. Calcul surface géodésique en projection Lambert-93 (EPSG:2154) via Shapely
3. Filtrage : surface ≥ 1 500 m² (seuil APER), flag "URGENCE_ABSOLUE" si ≥ 10 000 m²
4. Détection ombrières existantes : requête Overpass `power=generator/plant + source=solar` + calcul `pv_overlap_ratio` (ratio de recouvrement géométrique OSM en Lambert-93, via STRtree)
5. Classification : `equipe` (overlap ≥ 50 %), `a_verifier` (5–50 %), `libre` (< 5 %)
6. Enrichissement B2B : géocodage inversé BAN → adresse + INSEE ; parcelle cadastrale IGN ; entreprise via SIREN ; exclusion entités publiques (catégories juridiques préfixe 7/4) ; priorisation codes NAF (grande distribution 47.11F/D, logistique 52.10B, cliniques 86.10Z)
7. Valorisation : `surface_solaire = surface × 0.50` ; `kWc = surface_solaire / 5` ; `valeur_chantier = kWc × 1200€`
8. Export CSV local

**Constantes métier :**
```python
SURFACE_MIN_M2      = 1_500
SURFACE_URGENCE_M2  = 10_000
RATIO_SOLAIRE       = 0.50
M2_PAR_KWC          = 5
COUT_KWC_EUR        = 1_200
PV_OVERLAP_MIN      = 0.05
PV_OVERLAP_EQUIPE   = 0.50
```

**Décision récente importante :** le registre ODRÉ (RTE) a été retiré comme signal de classification. Il ne contenait aucune coordonnée géographique exploitable (IRIS renseigné à seulement 9 %) — l'utiliser forçait 61 % des leads en `a_verifier` sur une simple co-occurrence communale sans valeur probatoire. Seul le recouvrement géométrique OSM décide désormais du statut. Le champ `pv_registry_count` reste stocké à titre informatif sur la fiche uniquement.

---

## Stack à implémenter

```
Frontend   : Next.js 14 (App Router) + Tailwind CSS
Backend    : Next.js API Routes (serverless)
BDD        : Supabase (PostgreSQL + Auth + Storage)
Paiements  : Stripe (Checkout Sessions + Webhooks)
Emails     : Resend
Déploiement: Vercel
```

### Variables d'environnement (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
PIPELINE_INGEST_TOKEN=
```

---

## Schéma base de données (Supabase)

### Table `leads`
```sql
create table leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  osm_id              bigint unique not null,
  osm_type            text,
  latitude            numeric(9,6),
  longitude           numeric(9,6),
  departement         text not null,
  region              text,
  surface_m2          numeric(10,1) not null,
  flag_urgence        text not null,        -- 'URGENCE_ABSOLUE' | 'CONFORME_REQUIS'
  classification      text not null,        -- 'libre' | 'a_verifier' | 'equipe'
  pv_overlap_pct      numeric(4,3),         -- ratio 0..1 (signal géométrique OSM)
  pv_registry_count   integer default 0,    -- informatif seulement, ne filtre rien
  nom_osm             text,
  adresse             text,
  ville               text,
  surface_solaire_m2  numeric(10,1),
  puissance_kwc       numeric(10,1),
  valeur_chantier_eur numeric(12,0),
  score_confiance     numeric(3,2) default 0.5,
  code_insee          text,
  id_parcelle         text,
  siren               text,
  raison_sociale      text,
  code_naf            text,
  libelle_naf         text,
  dirigeant_nom       text,
  telephone           text,
  email_contact       text,
  -- Statut commercial
  statut              text not null default 'disponible',
  -- 'disponible' | 'vendu' | 'reserve' | 'expire'
  acheteur_id         uuid references auth.users(id),
  vendu_at            timestamptz,
  prix_lead_eur       integer               -- en centimes
);
create index on leads (departement, statut);
create index on leads (flag_urgence, statut);
create index on leads (region, statut);
create index on leads (classification, statut);
```

### Table `purchases`
```sql
create table purchases (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  lead_id           uuid references leads(id) not null,
  user_id           uuid references auth.users(id) not null,
  stripe_session_id text unique not null,
  stripe_payment_id text,
  montant_eur       integer not null,
  statut            text default 'pending',  -- 'pending' | 'paid' | 'refunded'
  lead_delivered_at timestamptz
);
```

### Table `profiles`
```sql
create table profiles (
  id                  uuid primary key references auth.users(id),
  created_at          timestamptz default now(),
  email               text,
  entreprise          text,
  telephone           text,
  region_cible        text,
  departements        text[],
  plan                text default 'free',   -- 'free' | 'starter' | 'territoire'
  abonnement_actif    boolean default false,
  stripe_customer_id  text,
  leads_achetes       integer default 0,
  notes_admin         text
);
```

### RLS
Les champs sensibles (`siren`, `raison_sociale`, `dirigeant_nom`, `telephone`, `email_contact`, `latitude`, `longitude`, `adresse`, `id_parcelle`) ne sont retournés par les API Routes que si `acheteur_id = user.id`. La RLS Supabase filtre les lignes ; le filtrage des colonnes se fait côté API Route.

---

## Structure des fichiers

```
/app
  /page.tsx                      # Landing page (site vitrine)
  /leads/page.tsx                # Dashboard public — liste leads
  /leads/[id]/page.tsx           # Fiche lead (3 états)
  /checkout/[leadId]/page.tsx    # Confirmation avant paiement
  /success/page.tsx              # Post-paiement
  /dashboard/page.tsx            # Espace client — mes leads achetés
  /admin/page.tsx                # Vue admin double panneau
  /api
    /leads/route.ts              # GET leads (filtrage, pagination)
    /leads/[id]/route.ts         # GET lead complet si acheté
    /checkout/route.ts           # POST → Stripe Checkout Session
    /webhooks/stripe/route.ts    # POST → events Stripe
    /admin/leads/route.ts        # GET/POST admin
    /admin/clients/route.ts      # GET clients par région
    /ingest/route.ts             # POST → ingestion pipeline Python
/components
  /LeadCard.tsx
  /LeadTable.tsx
  /SolarSimulator.tsx
  /PurchaseButton.tsx
  /AdminRegionView.tsx
```

---

## Landing page — sections dans l'ordre

1. **Hero** — fond sombre, badge "Loi APER · Obligation 2026", H1, sous-titre, 2 CTA, compteurs animés (85 000 parkings éligibles / 40 000€ amende / 1 200€/kWc)
2. **Fonctionnement** — 3 étapes : Extraction OSM → Enrichissement B2B → Lead exclusif livré
3. **Simulateur de potentiel** — composant `<SolarSimulator />` interactif (voir ci-dessous)
4. **Exemple de lead** — fiche mockée avec données partielles floutées (siren, dirigeant, tel masqués)
5. **Avantages** — 4 cards : Exclusivité totale / Données vérifiables / Volume garanti par la loi / 100% B2B RGPD simplifié
6. **Tarifs** — 4 offres (Échantillon 0€ / Lead Standard 80€ / Lead Urgence 150€ / Pack Territoire 400€/mois) + mention garantie remplacement
7. **Footer** — sources OSM/Etalab/Pappers, mentions légales, RGPD art.14

---

## Composant SolarSimulator

Slider surface 1 500 → 80 000 m². Formules :
```typescript
const surfaceSolaire = surface * 0.50
const puissanceKwc   = Math.round(surfaceSolaire / 5)
const valeurChantier = puissanceKwc * 1200
const isUrgence      = surface >= 10000
```
3 cards résultat : surface solaire (m²) / puissance crête (kWc) / valeur chantier (€ ou M€).
Flag dynamique : 🔴 URGENCE ABSOLUE si ≥ 10 000 m², sinon 🟡 Mise en conformité requise.
Formatage : `toLocaleString('fr-FR')` partout.
Props : `initialSurface?`, `locked?` (slider désactivé), `surfaceFromLead?` (prépositionné sur surface réelle).

---

## Dashboard leads `/leads`

Filtres : Région / Département / Surface min / Flag / NAF / Tri.
Tableau : Flag | Ville (Dépt) | Surface | kWc | Valeur chantier | NAF | Score | Statut | Action.
- Lead `disponible` → bouton [Acheter XX€]
- Lead `vendu` → ligne grisée, badge Vendu
- Lead acheté par l'user connecté → badge "Votre lead ✓"
- Lead `a_verifier` → badge orange "À vérifier" visible, toujours achetable
- Lead `equipe` → exclu de la liste publique (ne pas afficher)

L'API `GET /api/leads` ne retourne jamais les champs sensibles pour les leads non achetés par l'user.

---

## Fiche lead `/leads/[id]`

**État 1 — disponible :** données non-sensibles visibles, champs sensibles floutés CSS `blur(4px)`, simulateur pré-rempli `surfaceFromLead` en `locked`, bouton Acheter.

**État 2 — acheté par l'user :** tout débloqué, badge "Votre lead ✓ — Acheté le [date]", bouton télécharger PDF, simulateur interactif.

**État 3 — vendu à quelqu'un d'autre :** badge rouge Vendu, pas de bouton, lien vers dashboard.

---

## Tunnel Stripe

`POST /api/checkout` : vérifier statut `disponible` → créer Checkout Session avec `metadata: { leadId, userId }` → retourner `{ url }`.

`POST /api/webhooks/stripe` sur `checkout.session.completed` : transaction Supabase → UPDATE lead statut=vendu + acheteur_id + vendu_at → INSERT purchase → UPDATE profile leads_achetes++ → envoyer email Resend.

Prix leads :
- surface < 10 000 m² → 8 000 centimes (80€)
- surface ≥ 10 000 m² → 15 000 centimes (150€)

---

## Email de livraison (Resend)

Sujet : `Votre lead SolarIndex — [Ville] ([Dépt]) · [Surface] m²`
Contenu : toutes les données débloquées dans un tableau HTML propre + lien dashboard + rappel garantie remplacement 48h.
Attacher un CSV mono-ligne avec tous les champs.

---

## Vue Admin `/admin`

Layout double panneau côte à côte :
- **Gauche** : tableau leads avec tous les champs (y compris sensibles), filtres complets, bouton export CSV, bouton ajout manuel.
- **Droite** : clients groupés par région — pour chaque client : entreprise, départements cibles, leads achetés, plan.

**Matching géographique :** clic sur un lead gauche → surbrillance des clients droite dont `departements` contient le département du lead + bouton [Notifier ces clients] (email Resend "nouveau lead disponible dans votre zone").

Bandeau stats : Leads total / Leads vendus / CA total / Clients actifs.

---

## Endpoint ingestion `POST /api/ingest`

Header `Authorization: Bearer {PIPELINE_INGEST_TOKEN}`.
Body : tableau de leads format pipeline Python.
Logique : upsert sur `osm_id` (ne pas écraser le statut si `vendu`), calculer `region` depuis `departement`, calculer `prix_lead_eur`, retourner `{ inserted, updated, skipped }`.

Modifier `solarindex_pipeline.py` pour appeler cet endpoint au lieu d'exporter en CSV local.

---

## Priorités d'implémentation

```
Phase A — Backend
  1. Setup Supabase (tables + RLS)
  2. POST /api/ingest
  3. GET /api/leads
  4. GET /api/leads/[id]

Phase B — Paiement
  5. POST /api/checkout
  6. POST /api/webhooks/stripe
  7. Email Resend

Phase C — Frontend public
  8. Landing page complète
  9. Dashboard /leads
  10. Fiche /leads/[id]
  11. Page /success

Phase D — Auth + espace client
  12. Login/Register Supabase Auth
  13. /dashboard mes leads

Phase E — Admin
  14. /admin double panneau + matching

Phase F — Pipeline
  15. Modifier solarindex_pipeline.py → POST /api/ingest
```

---

## Améliorations pipeline à implémenter — toutes obligatoires

Ces 5 améliorations corrigent des limites connues du pipeline. Elles font partie du scope complet. Les implémenter dans `solarindex_pipeline.py` après la Phase F (connexion ingest), dans l'ordre ci-dessous.

> Spec technique complète dans `PIPELINE_BYPASSES_SPEC.md` — s'y référer pour chaque bypass, les cas limites et l'ordre d'exécution exact.

### 1. Élargissement OSM (stock +25 %)
Ajouter une seconde requête Overpass sans filtre `surface` pour capturer les parkings non tagués. Calculer quand même la surface géodésique. Ajouter un champ `surface_tag_present: bool` pour distinguer les deux cas. Upsert dans Supabase normalement.

```python
# Requête complémentaire — parkings sans tag surface
"""
way["amenity"="parking"][!"surface"](area.searchArea);
relation["amenity"="parking"][!"surface"](area.searchArea);
"""
```

### 2. Surface cadastrale réelle (fiabilité légale)
Quand l'`id_parcelle` est disponible (étape enrichissement), appeler le WFS IGN pour récupérer la géométrie exacte de la parcelle et recalculer la surface en Lambert-93. Stocker les deux : `surface_osm_m2` (détection) et `surface_cadastrale_m2` (calcul légal APER). C'est `surface_cadastrale_m2` qui fait foi pour l'éligibilité et le calcul kWc.

```python
url = "https://wxs.ign.fr/parcellaire/geoportail/wfs"
params = {
    "SERVICE": "WFS",
    "REQUEST": "GetFeature",
    "TYPENAME": "CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle",
    "CQL_FILTER": f"id_parcellaire='{id_parcelle}'",
    "OUTPUTFORMAT": "application/json"
}
```

Ajouter `surface_cadastrale_m2` à la table `leads` dans Supabase.

### 3. Propriétaire foncier réel via Pappers (qualité contact)
Après identification SIREN, appeler l'API Pappers pour remonter la chaîne capitalistique. Si la société trouvée a un actionnaire majoritaire personne morale, stocker les deux : `siren_exploitant` + `siren_proprietaire`. Afficher les deux sur la fiche lead avec le label approprié ("Exploitant légal APER" / "Propriétaire des murs").

```python
# Pappers API — actionnaires
GET https://api.pappers.fr/v2/entreprise?siren={siren}&actionnaires=true&api_token={TOKEN}
```

Ajouter `siren_proprietaire` et `raison_sociale_proprietaire` à la table `leads`.

### 4. Validation vision ombrières sur leads Urgence (confiance leads premium)
Pour tous les leads `flag_urgence = URGENCE_ABSOLUE` et `classification = libre` : appeler le WMS IGN BD ORTHO pour récupérer une image 1024×1024 centrée sur le centroïde du parking, puis appeler Claude Haiku 4.5 vision pour détecter la présence d'ombrières non cartographiées dans OSM.

```python
# WMS IGN BD ORTHO — image centrée sur le parking
wms_url = (
    "https://wxs.ign.fr/ortho/geoportail/r/wms"
    f"?SERVICE=WMS&REQUEST=GetMap&LAYERS=HR.ORTHOIMAGERY.ORTHOPHOTOS"
    f"&BBOX={bbox}&WIDTH=1024&HEIGHT=1024&FORMAT=image/png&CRS=EPSG:4326"
)

# Appel Haiku 4.5 vision (~$0.0016 par image)
# Prompt : "Ce parking extérieur a-t-il des structures de toiture, ombrières
# ou panneaux solaires visibles ? Réponds JSON : {ombriere: bool, confidence: 0-1}"
```

Si `ombriere: true` et `confidence > 0.7` → passer `classification` à `a_verifier` + stocker `vision_flag: true` + `vision_confidence` dans Supabase.

Ajouter `vision_flag bool` et `vision_confidence numeric(3,2)` à la table `leads`.

### 5. Détection dérogations APER — pente + zones protégées (flag informatif)
Pour chaque parking, deux vérifications :

**Pente :** appeler l'API Elevation IGN sur les 4 coins du bounding box. Si écart d'altitude > 5 % de la diagonale → `derogation_pente: true`.

```python
# API Elevation IGN
url = "https://wxs.ign.fr/calcul/geoportail/processes/elevation/execution"
```

**Zone ABF :** spatial join avec les périmètres monuments historiques (WFS Géoportail de l'Urbanisme). Si intersection → `derogation_abf: true`.

Ces deux flags n'excluent pas le lead de la vente. Ils s'affichent sur la fiche avec le message : "⚠️ Dérogation potentielle à vérifier — pente du terrain / zone ABF. L'installateur doit confirmer l'éligibilité avant signature."

Ajouter `derogation_pente bool`, `derogation_abf bool` à la table `leads`.

---

## Notes RGPD

Tous les leads sont des personnes morales — base légale intérêt légitime B2B (art. 6.1.f RGPD). Mention obligatoire sur le site : sources des données + droit d'opposition. Pas d'analytics avec cookies Phase 1.
