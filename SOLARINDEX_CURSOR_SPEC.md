# SolarIndex — Spécifications Produit Complètes
> Document de référence pour Cursor. Implémenter dans l'ordre des sections.

---

## 1. Stack Technique

```
Frontend  : Next.js 14 (App Router) + Tailwind CSS
Backend   : Next.js API Routes (serverless)
Base de données : Supabase (PostgreSQL + Auth + Storage)
Paiements : Stripe (Checkout Sessions + Webhooks)
Emails    : Resend (transactionnel) ou Brevo
Pipeline  : Script Python externe (solarindex_pipeline.py)
           → alimente Supabase via API REST
Déploiement : Vercel
```

### Variables d'environnement requises (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
ADMIN_SECRET_TOKEN=       # header Bearer pour les routes /api/admin/*
PIPELINE_INGEST_TOKEN=    # token pour l'ingestion Python → Supabase
```

---

## 2. Schéma Base de Données (Supabase / PostgreSQL)

### Table `leads`
```sql
create table leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),

  -- Géographie
  osm_id        bigint unique not null,
  osm_type      text,                        -- 'way' | 'relation'
  latitude      numeric(9,6) not null,
  longitude     numeric(9,6) not null,
  departement   text not null,               -- ex: '33'
  region        text,                        -- ex: 'Nouvelle-Aquitaine'

  -- Données parking
  surface_m2    numeric(10,1) not null,
  flag_urgence  text not null,               -- 'URGENCE_ABSOLUE' | 'CONFORME_REQUIS'
  nom_osm       text,
  adresse       text,
  ville         text,

  -- Potentiel solaire
  surface_solaire_m2  numeric(10,1),
  puissance_kwc       numeric(10,1),
  valeur_chantier_eur numeric(12,0),

  -- Enrichissement B2B (rempli par étapes 2 & 3 du pipeline)
  code_insee    text,
  id_parcelle   text,
  siren         text,
  raison_sociale text,
  code_naf      text,
  libelle_naf   text,
  dirigeant_nom text,
  telephone     text,
  email_contact text,

  -- Score de confiance (0.0 → 1.0)
  score_confiance numeric(3,2) default 0.5,

  -- Statut commercial
  statut        text not null default 'disponible',
  -- 'disponible' | 'vendu' | 'reserve' | 'expiré'
  acheteur_id   uuid references auth.users(id),
  vendu_at      timestamptz,
  prix_vente_eur integer                      -- en centimes
);

-- Index pour filtrage fréquent
create index on leads (departement, statut);
create index on leads (flag_urgence, statut);
create index on leads (region, statut);
```

### Table `purchases`
```sql
create table purchases (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  lead_id             uuid references leads(id) not null,
  user_id             uuid references auth.users(id) not null,
  stripe_session_id   text unique not null,
  stripe_payment_id   text,
  montant_eur         integer not null,       -- en centimes
  statut              text default 'pending', -- 'pending' | 'paid' | 'refunded'
  lead_delivered_at   timestamptz
);
```

### Table `profiles` (extension de auth.users)
```sql
create table profiles (
  id              uuid primary key references auth.users(id),
  created_at      timestamptz default now(),
  email           text,
  entreprise      text,
  telephone       text,
  region_cible    text,                       -- région principale d'activité
  departements    text[],                     -- ex: ['33', '40', '64']
  plan            text default 'free',        -- 'free' | 'starter' | 'territoire'
  abonnement_actif boolean default false,
  stripe_customer_id text,
  leads_achetes   integer default 0,
  -- Affiché côté admin pour matching géographique
  notes_admin     text
);
```

### Row Level Security (RLS)
```sql
-- leads : lecture publique des champs non-sensibles uniquement
-- Les champs sensibles (siren, raison_sociale, dirigeant, tel, email)
-- ne sont retournés que si statut = 'vendu' ET acheteur_id = auth.uid()
alter table leads enable row level security;

create policy "Leads visibles publiquement (données partielles)"
  on leads for select using (true);
-- Note : le filtrage des champs sensibles se fait côté API Route,
-- pas via RLS (RLS filtre les lignes, pas les colonnes).

-- purchases : visible uniquement par l'acheteur
alter table purchases enable row level security;
create policy "Purchases visibles par l'acheteur"
  on purchases for select using (auth.uid() = user_id);

-- profiles : visible par le propriétaire + admin
alter table profiles enable row level security;
create policy "Profile visible par son propriétaire"
  on profiles for all using (auth.uid() = id);
```

---

## 3. Structure des Fichiers Next.js

```
/app
  /page.tsx                    # Site vitrine (landing page)
  /leads
    /page.tsx                  # Dashboard public — liste des leads disponibles
    /[id]
      /page.tsx                # Fiche lead (données partielles ou complètes selon achat)
  /checkout
    /[leadId]/page.tsx         # Page de confirmation avant paiement
  /success/page.tsx            # Page post-paiement Stripe
  /dashboard
    /page.tsx                  # Espace client — leads achetés
  /admin
    /page.tsx                  # Vue admin — leads + clients par région
  /api
    /leads/route.ts            # GET leads (avec filtrage, pagination)
    /leads/[id]/route.ts       # GET lead complet (si acheté par l'user connecté)
    /checkout/route.ts         # POST → crée Stripe Checkout Session
    /webhooks/stripe/route.ts  # POST → reçoit events Stripe
    /admin/leads/route.ts      # GET/POST admin (token protégé)
    /admin/clients/route.ts    # GET clients par région
    /ingest/route.ts           # POST → ingestion depuis pipeline Python
/components
  /LeadCard.tsx
  /LeadTable.tsx
  /SolarSimulator.tsx          # Le simulateur interactif
  /PurchaseButton.tsx
  /AdminRegionView.tsx
/lib
  /supabase.ts
  /stripe.ts
  /email.ts
```

---

## 4. Site Vitrine — `/app/page.tsx`

### Sections à implémenter (dans l'ordre, scroll vertical)

**4.1 — Hero**
- Fond sombre (#0a1628 ou similaire), texte blanc
- Badge pill : "Loi APER · Obligation 2026"
- H1 : "SolarIndex — Les parkings non conformes, déjà identifiés."
- Sous-titre : "Nous extrayons les parkings de +1 500 m² soumis à l'obligation d'ombrières photovoltaïques et identifions leurs propriétaires. Un lead exclusif, un seul acheteur."
- Deux CTA : [Accéder aux leads →] (scroll vers #leads) et [Voir un exemple] (scroll vers #demo)
- Compteurs animés (chiffres qui montent au chargement) :
  ```
  ~85 000   Parkings éligibles estimés en France
  40 000€   Amende annuelle maximale (non-conformité)
  1 200€    Valeur marché par kWc installé
  ```

**4.2 — Fonctionnement en 3 étapes** (id="fonctionnement")
```
01 · Extraction OSM          02 · Enrichissement B2B       03 · Lead exclusif livré
Détection automatique des    Identification du propriétaire   Un seul acheteur par lead.
parkings ≥ 1 500 m² via      via cadastre + SIREN.           Fiche complète livrée par
Open Data et calcul de       Code NAF, dirigeant, contact.    email + dashboard.
surface géodésique.
```

**4.3 — Simulateur de Potentiel** (id="simulateur")
Utiliser le composant `<SolarSimulator />` (voir section 6 ci-dessous).
Titre de section : "Estimez la valeur d'un chantier"
Sous-titre : "Ajustez la surface pour voir le potentiel commercial du lead."

**4.4 — Exemple de Lead** (id="demo")
Carte avec données réelles (ou mock réaliste), style "fiche produit" :
```
┌─────────────────────────────────────────────────┐
│  🔴 URGENCE ABSOLUE          Score : 0.87 Élevé  │
│                                                   │
│  Hypermarché — Zone Commerciale Nord              │
│  Bordeaux Lac · Gironde (33)                      │
│                                                   │
│  Surface parking     22 400 m²                    │
│  Surface solaire     11 200 m²  (50% légal)       │
│  Puissance estimée   2 240 kWc                    │
│  Valeur chantier     2 688 000 €                  │
│                                                   │
│  Propriétaire        ██████████ SAS  [MASQUÉ]     │
│  SIREN               ███ ███ ███     [MASQUÉ]     │
│  Dirigeant           M. ████████     [MASQUÉ]     │
│  Contact             TEL OK          [MASQUÉ]     │
│                                                   │
│  [ Acheter ce lead — 150€ ]                       │
└─────────────────────────────────────────────────┘
```
Ajouter une note : "Les données masquées sont débloquées instantanément après achat."

**4.5 — Avantages** (4 cards)
```
Exclusivité totale          Données vérifiables         Volume garanti par la loi
1 lead = 1 acheteur.        SIREN cliquable, surface     85 000 parkings éligibles.
Aucune guerre de prix       OSM vérifiable, score        L'obligation APER crée un
entre installateurs.        de confiance par fiche.      stock structurel permanent.

100% B2B · RGPD simplifié
Personnes morales uniquement.
Régime intérêt légitime —
pas de consentement requis.
```

**4.6 — Tarifs** (id="tarifs")
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Échantillon     │  │  Lead Standard   │  │  Lead Urgence    │  │  Pack Territoire │
│  GRATUIT         │  │  80 €            │  │  150 €           │  │  400 € /mois     │
│                  │  │                  │  │  ━━━━━━━━━━━━━━  │  │  ━━━━━━━━━━━━━━  │
│ 3 leads démo     │  │ Parking          │  │ Parking          │  │ 10 leads exclusifs│
│ Données partielles│  │ 1 500–10 000 m² │  │ >10 000 m²       │  │ /mois            │
│ Département      │  │ Exclusif         │  │ Exclusif         │  │ 1 département    │
│ verrouillé       │  │ Fiche complète   │  │ Fiche complète   │  │ Mix Urgence+Std  │
│                  │  │ Email immédiat   │  │ Email immédiat   │  │ Tarif verrouillé │
│ [Essayer]        │  │ [Acheter]        │  │ [Acheter]        │  │ [S'abonner]      │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```
Mettre en avant "Lead Urgence" avec une bordure colorée (le "most popular").

Ajouter sous la grille :
> **Garantie non-négociable** — Remplacement 100% gratuit pour tout lead présentant
> une surface incorrecte, un propriétaire erroné ou un parking déjà équipé.

**4.7 — Footer**
Logo + liens (Produit, Tarifs, Aide, Mentions légales, CGV, RGPD Art.14)
Mention sources : OSM (ODbL), Etalab (LO v2.0), Pappers API — Traitement B2B en intérêt légitime

---

## 5. Dashboard Leads — `/app/leads/page.tsx`

### Barre de filtres (sticky en haut)
```
[Région ▼]  [Département ▼]  [Surface min ▼]  [Flag ▼]  [NAF ▼]  [Rechercher]
```
- Filtre Région : liste des régions françaises
- Filtre Flag : Tous / Urgence Absolue / Conforme Requis
- Tri : Valeur chantier ↓ / Surface ↓ / Date ajout ↓

### Affichage des leads
Mode tableau par défaut, toggle "Carte" (optionnel Phase 2).

Colonnes du tableau :
```
Flag | Ville (Dépt) | Surface | kWc | Valeur chantier | NAF | Score | Statut | Action
```

Règles d'affichage selon statut :
- `disponible` → ligne normale, bouton [Acheter XX€]
- `vendu` → ligne grisée, badge "Vendu", pas de bouton
- Lead acheté par l'user connecté → badge "Votre lead ✓", lien [Voir la fiche]

### Données masquées côté API
L'endpoint `GET /api/leads` retourne TOUJOURS les champs suivants, même pour les leads disponibles :
```json
{
  "id": "uuid",
  "departement": "33",
  "region": "Nouvelle-Aquitaine",
  "ville": "Bordeaux",
  "surface_m2": 22400,
  "flag_urgence": "URGENCE_ABSOLUE",
  "puissance_kwc": 2240,
  "valeur_chantier_eur": 2688000,
  "code_naf": "47.11F",
  "libelle_naf": "Hypermarchés",
  "score_confiance": 0.87,
  "statut": "disponible",
  "prix_lead": 150
}
```
Les champs suivants ne sont retournés QUE si `acheteur_id = auth.uid()` :
```
siren, raison_sociale, dirigeant_nom, telephone, email_contact,
adresse, id_parcelle, latitude, longitude
```

### Pagination
20 leads par page. Utiliser la pagination Supabase (`range()`).

---

## 6. Composant Simulateur — `/components/SolarSimulator.tsx`

Composant React réutilisé sur la landing page ET dans les fiches leads.

```tsx
// Props
interface SolarSimulatorProps {
  initialSurface?: number   // défaut: 12000
  locked?: boolean          // si true, slider désactivé (mode "preview fiche")
  surfaceFromLead?: number  // si fourni, slider prépositionné sur la surface réelle
}
```

**UI du composant :**
```
Surface parking (m²)
[━━━━━━━━━━━━●━━━━━━━━━━━━━━━] 12 000 m²
  1 500                        80 000

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Surface     │  │ Puissance   │  │ Valeur      │
│ solaire     │  │ crête       │  │ chantier    │
│             │  │             │  │             │
│  6 000 m²   │  │  1 200 kWc  │  │  1,44 M€    │
│ (50% légal) │  │  estimés    │  │  estimation │
└─────────────┘  └─────────────┘  └─────────────┘

🟡 Mise en conformité requise — seuil APER atteint
(devient 🔴 URGENCE ABSOLUE si surface ≥ 10 000 m²)
```

**Formules (identiques au pipeline Python) :**
```typescript
const surfaceSolaire = surface * 0.50
const puissanceKwc   = Math.round(surfaceSolaire / 5)
const valeurChantier = puissanceKwc * 1200
const isUrgence      = surface >= 10000
```

**Formatage des nombres :** toujours `toLocaleString('fr-FR')` pour les espaces de milliers.

---

## 7. Fiche Lead — `/app/leads/[id]/page.tsx`

### État 1 : Lead disponible (non acheté)
- Afficher toutes les données non-sensibles
- Simulateur pré-rempli avec la surface réelle du lead (`surfaceFromLead={lead.surface_m2}`, `locked={true}`)
- Bloc "Données masquées" avec champs floutés (CSS `blur(4px)`)
- Bouton [Acheter ce lead — XX€] → redirige vers `/checkout/[id]`
- Mention garantie sous le bouton

### État 2 : Lead acheté par l'user connecté
- Toutes les données débloquées
- Badge "Votre lead ✓ — Acheté le [date]"
- Bouton [Télécharger la fiche PDF]
- Afficher le simulateur en mode interactif

### État 3 : Lead vendu à quelqu'un d'autre
- Données non-sensibles visibles
- Badge rouge "Vendu"
- Pas de bouton d'achat
- Message : "Ce lead a été acquis. Consultez les leads disponibles →"

---

## 8. Tunnel de Paiement Stripe

### `POST /api/checkout`
```typescript
// Body : { leadId: string }
// Auth : user connecté (Supabase session)

// 1. Vérifier que le lead est encore 'disponible'
// 2. Vérifier que l'user ne l'a pas déjà acheté
// 3. Créer la Stripe Checkout Session :
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: 'eur',
      unit_amount: lead.prix_lead * 100, // en centimes
      product_data: {
        name: `Lead SolarIndex — ${lead.ville} (${lead.departement})`,
        description: `${lead.surface_m2} m² · ${lead.puissance_kwc} kWc · ${lead.flag_urgence}`,
      },
    },
    quantity: 1,
  }],
  metadata: { leadId, userId: session.user.id },
  success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url:  `${process.env.NEXT_PUBLIC_URL}/leads/${leadId}`,
})
// 4. Retourner { url: session.url }
```

### `POST /api/webhooks/stripe`
Gérer l'event `checkout.session.completed` :
```typescript
// 1. Vérifier la signature Stripe (stripe.webhooks.constructEvent)
// 2. Extraire leadId et userId depuis session.metadata
// 3. Dans une transaction Supabase (service role) :
//    a. UPDATE leads SET statut='vendu', acheteur_id=userId, vendu_at=now()
//       WHERE id=leadId AND statut='disponible'
//    b. INSERT INTO purchases (lead_id, user_id, stripe_session_id, montant_eur, statut)
//    c. UPDATE profiles SET leads_achetes = leads_achetes + 1
// 4. Envoyer l'email de livraison (voir section 9)
```

---

## 9. Email de Livraison (Resend)

Déclenché par le webhook Stripe après paiement confirmé.

**Sujet :** `Votre lead SolarIndex — [Ville] ([Dépt]) · [Surface] m²`

**Contenu HTML :**
```
Logo SolarIndex

Votre lead est prêt.

┌─────────────────────────────────────────────┐
│ Flag        : 🔴 URGENCE ABSOLUE             │
│ Localisation: Bordeaux Lac · 33              │
│ Surface     : 22 400 m²                      │
│ Puissance   : 2 240 kWc                      │
│ Valeur est. : 2 688 000 €                    │
├─────────────────────────────────────────────┤
│ Propriétaire : Casino France SAS             │
│ SIREN        : 395 476 312                   │
│ Dirigeant    : M. Jean-Charles Naouri        │
│ Téléphone    : 04 77 45 XX XX                │
│ Contact      : TEL OK                        │
├─────────────────────────────────────────────┤
│ Adresse      : ZAC du Lac Nord, 33300 Bdx   │
│ Parcelle     : 33063 000 AB 0042             │
│ Score conf.  : 0.87 (Élevé)                  │
└─────────────────────────────────────────────┘

[ Voir la fiche sur votre dashboard ]

Garantie : si une donnée est incorrecte, contactez-nous
pour un remplacement gratuit sous 48h.
```

Attacher aussi un CSV mono-ligne avec tous les champs.

---

## 10. Vue Admin — `/app/admin/page.tsx`

Accessible uniquement si `profiles.plan = 'admin'` OU via token Bearer dans header.

### Layout : deux panneaux côte à côte

```
┌─────────────────────────────────┬──────────────────────────────────┐
│  LEADS (filtres + tableau)      │  CLIENTS PAR RÉGION              │
│                                 │                                   │
│  [Région ▼] [Statut ▼] [NAF ▼] │  Nouvelle-Aquitaine  (3 clients) │
│                                 │  ┌────────────────────────────┐   │
│  ● Bordeaux Lac · 33            │  │ SolarPro Bordeaux          │   │
│    22 400 m² · URGENCE          │  │   Dépts : 33, 40, 64       │   │
│    Valeur : 2,69 M€  [VENDU]    │  │   Leads achetés : 4        │   │
│    → Acheté par SolarPro Bdx    │  │   Plan : starter           │   │
│                                 │  │   Email : contact@...      │   │
│  ○ Mérignac · 33                │  └────────────────────────────┘   │
│    12 000 m² · URGENCE          │  ┌────────────────────────────┐   │
│    Valeur : 1,44 M€ [DISPO]     │  │ Enerlux Sud-Ouest          │   │
│    Prix : 150€                  │  │   Dépts : 33, 47           │   │
│                                 │  │   Leads achetés : 1        │   │
│  ○ Pessac · 33                  │  │   Plan : free              │   │
│    3 200 m² · CONFORME          │  └────────────────────────────┘   │
│    Valeur : 384 000€ [DISPO]    │                                   │
│    Prix : 80€                   │  Île-de-France  (1 client)        │
│                                 │  ┌────────────────────────────┐   │
│  ... (pagination)               │  │ OmbrièrePV Paris           │   │
│                                 │  │   Dépts : 75, 92, 93, 94   │   │
│  [+ Ajouter lead manuellement]  │  │   Leads achetés : 0        │   │
│  [↓ Exporter CSV complet]       │  └────────────────────────────┘   │
└─────────────────────────────────┴──────────────────────────────────┘
```

### Fonctionnalité de matching (highlight)
Quand l'admin clique sur un lead dans le panneau gauche :
→ Mettre en surbrillance les clients du panneau droit dont le département cible
  correspond au département du lead.
→ Afficher un bouton [Notifier ces clients] qui envoie un email
  "Un nouveau lead vient d'être disponible dans votre zone".

### Statistiques globales (bandeau en haut)
```
Leads total : 847  |  Leads vendus : 23  |  CA total : 2 890€  |  Clients actifs : 7
```

---

## 11. Endpoint d'Ingestion Pipeline — `POST /api/ingest`

Appelé par le script Python après chaque run du pipeline.

```typescript
// Headers : Authorization: Bearer {PIPELINE_INGEST_TOKEN}
// Body : tableau de leads au format pipeline

// Pour chaque lead dans le body :
// 1. Upsert dans la table leads (ON CONFLICT osm_id DO UPDATE)
//    → ne PAS écraser le statut si déjà 'vendu'
//    → mettre à jour les données d'enrichissement si elles ont changé
// 2. Calculer automatiquement region depuis departement
//    (mapping depts → régions hardcodé ou table séparée)
// 3. Calculer prix_lead selon surface :
//    surface < 10000 → 8000 (centimes = 80€)
//    surface >= 10000 → 15000 (centimes = 150€)
// 4. Retourner { inserted: N, updated: M, skipped: K }
```

### Mapping département → région
```typescript
const DEPT_REGION: Record<string, string> = {
  '01': 'Auvergne-Rhône-Alpes',
  '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine',
  '64': 'Nouvelle-Aquitaine',
  '69': 'Auvergne-Rhône-Alpes',
  '75': 'Île-de-France',
  '92': 'Île-de-France',
  '93': 'Île-de-France',
  '94': 'Île-de-France',
  // ... compléter pour les 96 départements
}
```

---

## 12. Authentification (Supabase Auth)

- Inscription/connexion par email + mot de passe
- Pas de SSO pour la Phase 1
- À l'inscription, créer automatiquement un profil dans `profiles` (trigger Supabase)
- Route protégée `/dashboard` → redirect vers `/login` si non connecté
- Route protégée `/admin` → redirect vers `/` si non admin

---

## 13. Composant `<LeadCard />` — Réutilisable

```tsx
interface LeadCardProps {
  lead: Lead
  variant: 'list' | 'detail' | 'admin'
  isOwned: boolean      // true si l'user connecté a acheté ce lead
  onBuy?: () => void
}
```

En mode `list` : version compacte (une ligne de tableau ou une carte).
En mode `detail` : version complète avec simulateur intégré.
En mode `admin` : toutes les données + actions admin.

---

## 14. Priorités d'Implémentation (dans l'ordre)

```
Phase A — Backend fondamental (sans UI)
  ✓ Setup Supabase (tables, RLS)
  ✓ Endpoint POST /api/ingest
  ✓ Endpoint GET /api/leads (avec filtrage)
  ✓ Endpoint GET /api/leads/[id]

Phase B — Paiement
  ✓ Endpoint POST /api/checkout
  ✓ Webhook Stripe POST /api/webhooks/stripe
  ✓ Email de livraison (Resend)

Phase C — Frontend public
  ✓ Landing page (site vitrine)
  ✓ Dashboard /leads avec tableau + filtres
  ✓ Fiche lead /leads/[id] (3 états)
  ✓ Composant SolarSimulator
  ✓ Page /success post-paiement

Phase D — Espace client
  ✓ Auth (login/register)
  ✓ /dashboard → mes leads achetés

Phase E — Admin
  ✓ Vue /admin avec double panneau leads + clients
  ✓ Matching géographique + bouton notification
  ✓ Export CSV

Phase F — Pipeline Python → Supabase
  ✓ Modifier solarindex_pipeline.py pour appeler POST /api/ingest
    au lieu d'exporter en CSV local
```

---

## 15. Notes RGPD

- Tous les leads sont des **personnes morales** (entreprises) — pas de personnes physiques.
- Base légale : **intérêt légitime** (art. 6.1.f RGPD) pour la prospection B2B.
- Mention obligatoire sur le site : source des données (OSM, Etalab, Pappers) + droit d'opposition.
- Pas de cookie analytics sans consentement (Phase 1 : pas d'analytics du tout, ou Plausible sans cookies).
- Conserver les données leads maximum 3 ans après la date de vente.
