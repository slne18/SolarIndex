# SolarIndex — Spec technique complète : 5 améliorations pipeline
> À intégrer dans `solarindex_pipeline.py` après la Phase F (connexion ingest).
> Implémenter dans l'ordre 1→5. Chaque bypass est indépendant mais s'appuie
> sur les colonnes Supabase ajoutées par le précédent.

---

## Migrations Supabase à exécuter avant tout

```sql
-- Bypass 2
alter table leads add column if not exists surface_cadastrale_m2 numeric(10,1);
alter table leads add column if not exists source_surface text default 'osm';
-- 'osm' | 'cadastre' | 'osm_fallback' (cadastre tenté mais échoué)

-- Bypass 3
alter table leads add column if not exists siren_proprietaire text;
alter table leads add column if not exists raison_sociale_proprietaire text;
alter table leads add column if not exists type_entite text;
-- 'exploitant_seul' | 'exploitant_et_proprietaire' | 'holding_etrangere' | 'inconnu'

-- Bypass 4
alter table leads add column if not exists vision_flag bool default false;
alter table leads add column if not exists vision_confidence numeric(3,2);
alter table leads add column if not exists vision_checked_at timestamptz;

-- Bypass 5
alter table leads add column if not exists derogation_pente bool default false;
alter table leads add column if not exists derogation_abf bool default false;
alter table leads add column if not exists pente_pct numeric(4,1);
-- pente moyenne estimée en %
```

---

## Bypass 1 — Élargissement OSM (parkings sans tag surface)

### Objectif
Capturer les parkings `amenity=parking` qui n'ont pas de tag `surface` — soit parce que le contributeur OSM ne l'a pas renseigné, soit parce que le parking a été ajouté automatiquement. Ces parkings existent physiquement mais sont absents du stock actuel.

### Implémentation dans `solarindex_pipeline.py`

**Nouvelle fonction à ajouter :**
```python
def build_overpass_query_no_surface(dept_id: str) -> str:
    """
    Requête complémentaire : parkings sans tag surface.
    On exclut explicitement ceux qui ont déjà surface=* pour éviter les doublons
    avec la requête principale (un parking avec surface=grass ne nous intéresse pas,
    et un avec surface=asphalt est déjà capturé).
    """
    return f"""
[out:json][timeout:120];
area["ref:INSEE"~"^{dept_id}"]["admin_level"="6"]->.searchArea;
(
  way["amenity"="parking"][!"surface"](area.searchArea);
  relation["amenity"="parking"][!"surface"](area.searchArea);
);
out geom;
""".strip()
```

**Modification de `run_pipeline()` :**
```python
# Après la requête principale, lancer la requête complémentaire
elements_with_surface    = fetch_overpass(build_overpass_query(dept_id))
elements_without_surface = fetch_overpass(build_overpass_query_no_surface(dept_id))

# Fusionner en déduplicant sur osm_id
all_ids = {el["id"] for el in elements_with_surface}
extra   = [el for el in elements_without_surface if el["id"] not in all_ids]
elements = elements_with_surface + extra
```

**Champ à ajouter sur chaque record :**
```python
record["surface_tag_present"] = (el in elements_with_surface)
# True  → surface=asphalt/concrete/paved confirmé dans OSM
# False → surface non renseigné, parking inféré par géométrie uniquement
```

**Affichage sur la fiche lead :**
- Si `surface_tag_present = False` → badge discret "Surface inférée — non confirmée OSM" sur la fiche.
- Score de confiance réduit automatiquement de 0,1 pour ces leads.

**Cas limites :**
- Un parking sans surface et avec une géométrie approximative peut avoir une surface calculée très différente de la réalité. Le seuil de filtrage reste 1 500 m² mais ces leads ont un `score_confiance` plafonné à 0,7 (jamais 0,9+).
- Si la seconde requête Overpass timeout (serveur surchargé) → logger l'erreur, continuer avec les résultats de la première requête uniquement, ne pas bloquer le pipeline.

---

## Bypass 2 — Surface cadastrale réelle (WFS IGN)

### Objectif
Remplacer la surface OSM par la surface cadastrale officielle pour le calcul d'éligibilité APER et le calcul kWc. La surface OSM sert à la détection ; la surface cadastrale fait foi pour le seuil légal de 1 500 m².

### API utilisée
```
WFS IGN — Plan Cadastral Informatisé
URL    : https://wxs.ign.fr/parcellaire/geoportail/wfs
Layer  : CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle
Auth   : aucune (open data, pas de clé requise)
Format : GeoJSON
```

### Fonction complète à ajouter

```python
from shapely.geometry import shape as shapely_shape

def fetch_surface_cadastrale(id_parcelle: str,
                              timeout: int = 10) -> float | None:
    """
    Récupère la surface cadastrale officielle d'une parcelle via WFS IGN.

    Args:
        id_parcelle : identifiant parcelle format IGN, ex: "33063000AB0042"
                      (code_insee + section + numéro, sans espaces)
        timeout     : timeout HTTP en secondes

    Returns:
        Surface en m² (float) ou None si échec (parcelle non trouvée,
        timeout, erreur réseau, géométrie invalide)

    Notes sur l'id_parcelle :
        L'API Etalab (étape 2 du pipeline) retourne l'id au format
        "33063 000 AB 0042" avec espaces. Normaliser avant d'appeler :
        id_clean = id_parcelle.replace(" ", "")
    """
    id_clean = id_parcelle.replace(" ", "")

    params = {
        "SERVICE":      "WFS",
        "VERSION":      "2.0.0",
        "REQUEST":      "GetFeature",
        "TYPENAME":     "CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle",
        "CQL_FILTER":   f"id_parcellaire='{id_clean}'",
        "OUTPUTFORMAT": "application/json",
        "COUNT":        "1",
    }

    try:
        r = requests.get(
            "https://wxs.ign.fr/parcellaire/geoportail/wfs",
            params=params,
            timeout=timeout,
            headers={"User-Agent": "SolarIndex-Pipeline/1.0"}
        )
        r.raise_for_status()
        data = r.json()

        features = data.get("features", [])
        if not features:
            return None  # Parcelle non trouvée dans le PCI

        geom = shapely_shape(features[0]["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)

        # La géométrie WFS IGN est en Lambert-93 natif — surface directe en m²
        # Vérifier le CRS dans la réponse pour confirmer
        crs = data.get("crs", {}).get("properties", {}).get("name", "")
        if "2154" not in crs and "Lambert" not in crs:
            # Cas rare : réponse en WGS84 → reprojeter
            geom = reproject_to_lambert93(geom)

        surface = geom.area
        # Sanity check : rejeter les surfaces aberrantes
        if surface < 10 or surface > 5_000_000:
            return None

        return round(surface, 1)

    except requests.Timeout:
        # IGN WFS peut être lent en heures de pointe
        return None
    except (requests.RequestException, KeyError, ValueError):
        return None
```

### Logique de décision dans le pipeline

```python
def resolve_surface(surface_osm: float,
                    id_parcelle: str | None) -> tuple[float, str]:
    """
    Détermine la surface à utiliser pour les calculs APER.

    Returns:
        (surface_retenue_m2, source)
        source : 'osm' | 'cadastre' | 'osm_fallback'
    """
    if not id_parcelle:
        return surface_osm, "osm"

    surface_cadastrale = fetch_surface_cadastrale(id_parcelle)

    if surface_cadastrale is None:
        # IGN n'a pas retourné de résultat → fallback OSM
        return surface_osm, "osm_fallback"

    # Vérification cohérence : si l'écart est > 300 %, c'est probablement
    # une mauvaise correspondance parcelle (un grand terrain avec bâtiment
    # vs juste le parking). On garde le minimum des deux par prudence.
    ratio = surface_cadastrale / surface_osm if surface_osm > 0 else 1
    if ratio > 3.0 or ratio < 0.1:
        # Écart suspect → garder OSM, noter l'anomalie
        record["surface_cadastrale_m2"] = surface_cadastrale  # stocker quand même
        return surface_osm, "osm_fallback"

    return surface_cadastrale, "cadastre"
```

**Intégration dans le record :**
```python
surface_retenue, source = resolve_surface(surface_osm, record.get("id_parcelle"))
record["surface_m2"]           = surface_retenue   # surface qui fait foi
record["surface_osm_m2"]       = surface_osm       # pour traçabilité
record["surface_cadastrale_m2"] = surface_cadastrale or None
record["source_surface"]       = source

# Recalculer le potentiel sur la surface retenue
solar = compute_solar_potential(surface_retenue)
```

**Cas limites :**
- Parcelle agricole englobant un parking privé : la surface cadastrale sera celle du terrain entier (trop grande). Le ratio > 3 déclenche le fallback OSM.
- Parking à cheval sur plusieurs parcelles : `id_parcelle` correspond à la parcelle du centroïde seulement. Surface cadastrale sous-estimée possible. Acceptable en Phase 1 — noter dans le `source_surface = 'cadastre_partiel'` si le ratio est entre 0,3 et 0,5.
- Rate limiting IGN : pas de rate limit documenté sur le WFS public, mais ajouter `time.sleep(0.2)` entre chaque appel pour rester courtois. Si > 3 erreurs consécutives → pause 30 secondes.

---

## Bypass 3 — Propriétaire foncier réel (Pappers API)

### Objectif
SIREN retourne l'exploitant du site (la société qui y opère). Pour les grandes surfaces et les foncières, le propriétaire des murs est une entité différente — et c'est lui qui doit légalement équiper le parking (loi APER art. L111-19-1 : obligation sur le propriétaire OU l'exploitant, priorité propriétaire). Remonter la chaîne capitalistique via Pappers pour identifier les deux.

### API utilisée
```
Pappers API v2
Base URL : https://api.pappers.fr/v2
Auth     : ?api_token={PAPPERS_API_TOKEN}  (clé en variable d'environnement)
Endpoints utilisés :
  GET /entreprise?siren={siren}&actionnaires=true
  GET /entreprise?siren={siren_actionnaire}&actionnaires=false
```

### Logique de décision complète

```python
def resolve_proprietaire(siren_exploitant: str,
                          pappers_token: str) -> dict:
    """
    Remonte la chaîne capitalistique pour identifier le propriétaire réel.

    Logique :
    1. Appeler Pappers sur le SIREN exploitant → liste des actionnaires
    2. Identifier l'actionnaire majoritaire personne morale (participation >= 50%)
    3. Si trouvé et français (SIREN valide) → c'est le propriétaire probable
    4. Si l'actionnaire est lui-même une holding → tenter un niveau supplémentaire
       (un seul niveau de remontée, pas récursif)
    5. Cas spéciaux : holding étrangère, actionnariat dispersé, données absentes

    Returns dict avec :
        siren_proprietaire          : str | None
        raison_sociale_proprietaire : str | None
        type_entite                 : str
        confidence_proprietaire     : float (0..1)
    """
    result = {
        "siren_proprietaire": None,
        "raison_sociale_proprietaire": None,
        "type_entite": "inconnu",
        "confidence_proprietaire": 0.0,
    }

    if not siren_exploitant or not pappers_token:
        return result

    # ── Étape 1 : récupérer les actionnaires de l'exploitant ──────────────────
    try:
        r = requests.get(
            "https://api.pappers.fr/v2/entreprise",
            params={"siren": siren_exploitant, "actionnaires": "true",
                    "api_token": pappers_token},
            timeout=10,
            headers={"User-Agent": "SolarIndex-Pipeline/1.0"}
        )
        r.raise_for_status()
        data = r.json()
    except requests.RequestException:
        return result

    actionnaires = data.get("actionnaires", [])
    if not actionnaires:
        # Pas d'actionnaire connu → exploitant = propriétaire probable
        result["type_entite"] = "exploitant_seul"
        result["confidence_proprietaire"] = 0.5
        return result

    # ── Étape 2 : identifier l'actionnaire majoritaire personne morale ─────────
    # Trier par participation décroissante
    actionnaires_pm = [
        a for a in actionnaires
        if a.get("type") == "Personne Morale"
        and a.get("participation_directe", 0) >= 50
    ]

    if not actionnaires_pm:
        # Actionnariat dispersé ou uniquement personnes physiques
        # → exploitant est probablement aussi exploitant des murs
        result["type_entite"] = "exploitant_et_proprietaire"
        result["confidence_proprietaire"] = 0.6
        return result

    # Prendre le plus gros actionnaire PM
    actionnaire_principal = max(
        actionnaires_pm,
        key=lambda a: a.get("participation_directe", 0)
    )
    participation = actionnaire_principal.get("participation_directe", 0)

    # ── Étape 3 : vérifier si c'est une entité française avec SIREN ───────────
    siren_actionnaire = actionnaire_principal.get("siren")

    if not siren_actionnaire:
        # Holding étrangère (pas de SIREN français)
        result["type_entite"] = "holding_etrangere"
        result["raison_sociale_proprietaire"] = actionnaire_principal.get(
            "denomination", "Holding étrangère"
        )
        result["confidence_proprietaire"] = 0.4
        return result

    # ── Étape 4 : vérifier si l'actionnaire est lui-même une holding pure ──────
    # (SCI, holding financière) → tenter un niveau supplémentaire
    naf_actionnaire = actionnaire_principal.get("code_naf", "")
    is_holding = naf_actionnaire.startswith("64") or naf_actionnaire.startswith("68")
    # NAF 64xx = activités financières, 68xx = activités immobilières

    siren_final = siren_actionnaire
    raison_finale = actionnaire_principal.get("denomination", "")

    if is_holding:
        # Tenter un niveau supplémentaire (une seule fois, pas récursif)
        try:
            r2 = requests.get(
                "https://api.pappers.fr/v2/entreprise",
                params={"siren": siren_actionnaire, "actionnaires": "true",
                        "api_token": pappers_token},
                timeout=10,
                headers={"User-Agent": "SolarIndex-Pipeline/1.0"}
            )
            r2.raise_for_status()
            data2 = r2.json()
            actionnaires2 = [
                a for a in data2.get("actionnaires", [])
                if a.get("type") == "Personne Morale"
                and a.get("participation_directe", 0) >= 50
                and a.get("siren")
            ]
            if actionnaires2:
                top = max(actionnaires2,
                          key=lambda a: a.get("participation_directe", 0))
                siren_final  = top["siren"]
                raison_finale = top.get("denomination", raison_finale)
        except requests.RequestException:
            pass  # Échec niveau 2 → on garde niveau 1
        time.sleep(0.3)  # Rate limiting Pappers

    # ── Résultat final ─────────────────────────────────────────────────────────
    result["siren_proprietaire"]           = siren_final
    result["raison_sociale_proprietaire"]  = raison_finale
    result["type_entite"]                  = "exploitant_et_proprietaire" \
                                             if siren_final == siren_exploitant \
                                             else "exploitant_different_proprietaire"
    # Confidence : plus la participation est élevée, plus on est sûr
    result["confidence_proprietaire"] = min(0.95, participation / 100 + 0.1)

    return result
```

**Intégration dans le pipeline :**
```python
# Après l'enrichissement SIREN (étape 3 existante)
if record.get("siren") and PAPPERS_TOKEN:
    prop = resolve_proprietaire(record["siren"], PAPPERS_TOKEN)
    record.update(prop)
    time.sleep(0.2)  # 5 req/s max Pappers API gratuite
```

**Affichage sur la fiche lead :**
```
type_entite = 'exploitant_seul'
  → "Exploitant (propriétaire probable) : [raison_sociale]"

type_entite = 'exploitant_et_proprietaire'
  → "Exploitant et propriétaire : [raison_sociale]"

type_entite = 'exploitant_different_proprietaire'
  → "Exploitant légal APER : [raison_sociale]"
     "Groupe propriétaire   : [raison_sociale_proprietaire]"
     "→ Contacter en priorité : le propriétaire (obligation APER art. L111-19-1)"

type_entite = 'holding_etrangere'
  → "Exploitant : [raison_sociale]"
     "Groupe propriétaire : [raison_sociale_proprietaire] (entité étrangère)"
     "→ Interlocuteur probable : direction immobilière de l'exploitant"
```

**Cas limites :**
- SIREN invalide retourné par Pappers → vérifier format (9 chiffres) avant d'appeler le niveau 2.
- Pappers API gratuite limitée à ~100 req/min → `time.sleep(0.6)` si le pipeline tourne sur > 1 000 leads.
- Pappers retourne parfois des participations à 0 % (actionnaire historique sorti). Filtrer `participation_directe > 0` strictement.
- Si `PAPPERS_TOKEN` absent de l'environnement → logger un warning, skip silencieux, `type_entite = 'inconnu'`. Ne pas bloquer le pipeline.

---

## Bypass 4 — Validation vision ombrières (Claude Haiku 4.5)

### Objectif
Pour les leads `flag_urgence = URGENCE_ABSOLUE` ET `classification = libre`, vérifier via orthophoto + vision LLM qu'il n'y a pas d'ombrières physiquement présentes mais non encore cartographiées dans OSM. Ces leads sont les plus chers (150€) — le taux de faux positifs doit être minimal.

### Périmètre d'application
```python
# Ne lancer la vision QUE sur ce sous-ensemble
VISION_CONDITION = (
    lead["flag_urgence"] == "URGENCE_ABSOLUE"
    and lead["classification"] == "libre"
    and lead["vision_checked_at"] is None  # ne pas re-vérifier
)
```

### Étape 1 : Récupérer l'orthophoto WMS IGN

```python
import math
import base64
from io import BytesIO

def fetch_ortho_image_b64(lat: float, lon: float,
                           surface_m2: float,
                           size_px: int = 1024) -> str | None:
    """
    Récupère une image PNG de l'orthophoto IGN centrée sur le parking.

    La bbox est calculée pour englober le parking avec une marge de 20 %
    (pour voir le contexte autour — essentiel pour distinguer ombrières vs bâtiments).

    Args:
        lat, lon     : centroïde du parking (WGS84)
        surface_m2   : surface pour calculer la taille de la bbox
        size_px      : résolution de l'image (1024 = bon compromis qualité/coût tokens)

    Returns:
        Image encodée en base64 (PNG) ou None si échec
    """
    # Calculer le rayon approximatif du parking en degrés
    # 1 degré lat ≈ 111 000 m ; 1 degré lon ≈ 111 000 * cos(lat) m
    rayon_m  = math.sqrt(surface_m2 / math.pi) * 1.5  # +50% de marge
    delta_lat = rayon_m / 111_000
    delta_lon = rayon_m / (111_000 * math.cos(math.radians(lat)))

    bbox = (
        f"{lon - delta_lon},{lat - delta_lat},"
        f"{lon + delta_lon},{lat + delta_lat}"
    )

    wms_url = (
        "https://wxs.ign.fr/ortho/geoportail/r/wms"
        f"?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
        f"&LAYERS=HR.ORTHOIMAGERY.ORTHOPHOTOS"
        f"&BBOX={bbox}"
        f"&WIDTH={size_px}&HEIGHT={size_px}"
        f"&FORMAT=image/png"
        f"&CRS=EPSG:4326"
    )

    try:
        r = requests.get(wms_url, timeout=30,
                         headers={"User-Agent": "SolarIndex-Pipeline/1.0"})
        r.raise_for_status()

        # Vérifier que c'est bien une image (pas un message d'erreur XML)
        if "image/png" not in r.headers.get("Content-Type", ""):
            return None

        # Vérifier que l'image n'est pas entièrement noire/blanche (zone sans ortho)
        img_bytes = r.content
        if len(img_bytes) < 5_000:  # < 5ko = image vide probable
            return None

        return base64.standard_b64encode(img_bytes).decode("utf-8")

    except requests.RequestException:
        return None
```

### Étape 2 : Appel Claude Haiku 4.5 vision

```python
import anthropic

HAIKU_CLIENT = anthropic.Anthropic()  # utilise ANTHROPIC_API_KEY de l'env

VISION_PROMPT = """Tu analyses une orthophoto aérienne d'un parking extérieur en France.

Ta mission : détecter la présence d'ombrières photovoltaïques ou de structures de toiture
couvrant tout ou partie du parking.

Indices visuels d'ombrières PV :
- Structures régulières métalliques surélevées (souvent grises, bleues ou noires)
- Rangées parallèles de panneaux solaires au-dessus des places de stationnement
- Ombres portées régulières au sol venant de structures horizontales
- Différence de texture entre zones couvertes et zones de bitume nu

Ne pas confondre avec :
- Bâtiments adjacents (murs verticaux, toitures inclinées d'entrepôts)
- Arbres ou végétation (texture organique irrégulière)
- Marquages au sol (bandes blanches, flèches)
- Panneaux solaires au sol (sans structure surélevée)

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après :
{
  "ombriere_detectee": true | false,
  "confidence": 0.0 à 1.0,
  "surface_couverte_pct": 0 à 100,
  "notes": "description courte de ce que tu vois (max 100 chars)"
}"""

def check_vision_ombriere(image_b64: str) -> dict:
    """
    Appelle Claude Haiku 4.5 pour détecter les ombrières sur l'orthophoto.

    Coût : ~$0.0016 par appel (1 400 tokens image + 50 prompt + 80 output)

    Returns dict avec ombriere_detectee, confidence, surface_couverte_pct, notes
    ou dict avec ombriere_detectee=None en cas d'erreur
    """
    try:
        response = HAIKU_CLIENT.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": VISION_PROMPT}
                ],
            }]
        )

        text = response.content[0].text.strip()
        # Nettoyer au cas où Haiku aurait ajouté du markdown
        text = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)

        # Valider les champs attendus
        assert isinstance(result.get("ombriere_detectee"), bool)
        assert 0.0 <= result.get("confidence", 0) <= 1.0

        return result

    except (json.JSONDecodeError, AssertionError, KeyError):
        # Réponse malformée → on ne sait pas → traiter comme absence de signal
        return {"ombriere_detectee": None, "confidence": 0.0,
                "surface_couverte_pct": 0, "notes": "erreur_parsing"}
    except anthropic.APIError:
        return {"ombriere_detectee": None, "confidence": 0.0,
                "surface_couverte_pct": 0, "notes": "erreur_api"}
```

### Étape 3 : Logique de décision et mise à jour classification

```python
def apply_vision_result(record: dict, vision: dict) -> dict:
    """
    Met à jour la classification du lead selon le résultat vision.

    Seuils :
        ombriere=True  + confidence >= 0.80 → classification = 'a_verifier'
        ombriere=True  + confidence  < 0.80 → classification = 'a_verifier'
                                               + noter confidence faible
        ombriere=False + confidence >= 0.70 → classification reste 'libre'
                                               + score_confiance += 0.10
        ombriere=None  (erreur)             → classification inchangée
    """
    from datetime import datetime, timezone

    record["vision_checked_at"] = datetime.now(timezone.utc).isoformat()

    if vision["ombriere_detectee"] is None:
        # Erreur technique → ne rien changer
        return record

    record["vision_flag"]        = vision["ombriere_detectee"]
    record["vision_confidence"]  = round(vision["confidence"], 2)

    if vision["ombriere_detectee"] and vision["confidence"] >= 0.70:
        # Signal positif suffisamment confiant → dégrader la classification
        record["classification"] = "a_verifier"
        # Ne pas passer directement à 'equipe' — seul le recouvrement OSM
        # géométrique peut faire ça. La vision est un signal, pas une preuve.

    elif not vision["ombriere_detectee"] and vision["confidence"] >= 0.70:
        # Confirmation négative → booster légèrement le score de confiance
        record["score_confiance"] = min(0.95,
            (record.get("score_confiance") or 0.5) + 0.10)

    return record
```

### Étape 4 : Orchestration avec Batch API Anthropic (économie 50 %)

Pour les runs sur > 100 leads Urgence, utiliser le Batch API :

```python
def run_vision_batch(leads_urgence: list[dict]) -> dict[str, dict]:
    """
    Envoie tous les appels vision en batch (50 % moins cher que les appels individuels).
    Polling jusqu'à completion.

    Returns : dict osm_id → résultat vision
    """
    requests_batch = []
    images_cache   = {}  # osm_id → image_b64

    for lead in leads_urgence:
        img = fetch_ortho_image_b64(
            lead["latitude"], lead["longitude"], lead["surface_m2"]
        )
        if img is None:
            continue
        images_cache[lead["osm_id"]] = img
        requests_batch.append({
            "custom_id": str(lead["osm_id"]),
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 200,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {
                            "type": "base64", "media_type": "image/png",
                            "data": img
                        }},
                        {"type": "text", "text": VISION_PROMPT}
                    ]
                }]
            }
        })

    if not requests_batch:
        return {}

    # Créer le batch
    batch = HAIKU_CLIENT.messages.batches.create(requests=requests_batch)
    print(f"    Vision batch créé : {batch.id} ({len(requests_batch)} images)")

    # Polling jusqu'à completion (le batch peut prendre 5-30 min)
    import time
    while True:
        status = HAIKU_CLIENT.messages.batches.retrieve(batch.id)
        if status.processing_status == "ended":
            break
        print(f"    Vision batch en cours... ({status.request_counts})")
        time.sleep(30)

    # Récupérer les résultats
    results = {}
    for item in HAIKU_CLIENT.messages.batches.results(batch.id):
        osm_id = int(item.custom_id)
        if item.result.type == "succeeded":
            text = item.result.message.content[0].text.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            try:
                results[osm_id] = json.loads(text)
            except json.JSONDecodeError:
                results[osm_id] = {"ombriere_detectee": None, "confidence": 0.0}
        else:
            results[osm_id] = {"ombriere_detectee": None, "confidence": 0.0}

    return results
```

**Cas limites :**
- IGN WMS retourne une erreur XML pour les zones sans couverture ortho récente (DOM-TOM, zones rurales isolées) → vérifier `Content-Type` de la réponse avant de passer à Haiku.
- Parking en milieu urbain dense : Haiku peut confondre toiture d'un bâtiment adjacent avec une ombrière. Le prompt insiste sur "structures au-dessus des places de stationnement" — si incertain, `confidence` sera < 0.70 et on ne change pas la classification.
- Image trop petite (surface_m2 < 2 000) : la bbox est très petite, l'image peu exploitable. Pour ces cas `size_px = 512` suffit.
- `ANTHROPIC_API_KEY` absent → logger warning, skip silencieux.

---

## Bypass 5 — Détection dérogations APER (pente + zones ABF)

### Objectif
Ajouter deux flags informatifs sur chaque fiche : pente du terrain (dérogation possible si > 5 %) et présence dans une zone ABF / périmètre monument historique (dérogation possible). Ces flags ne retirent pas le lead de la vente — ils préviennent l'installateur d'une vérification complémentaire.

### Partie A : Pente via API Elevation IGN

```python
def fetch_pente_pct(lat: float, lon: float,
                     surface_m2: float) -> float | None:
    """
    Estime la pente moyenne du terrain sous le parking.

    Méthode : appeler l'API Elevation IGN sur les 4 coins du bounding box
    du parking, calculer la différence d'altitude max-min, diviser par
    la diagonale du rectangle pour obtenir une pente en %.

    L'API Elevation IGN (RGE ALTI 1m) retourne l'altitude en mètres NGF.

    Returns:
        Pente estimée en % ou None si échec API
    """
    rayon_m  = math.sqrt(surface_m2 / math.pi)
    delta_lat = rayon_m / 111_000
    delta_lon = rayon_m / (111_000 * math.cos(math.radians(lat)))

    # 4 coins du bounding box
    coins = [
        (lat - delta_lat, lon - delta_lon),
        (lat - delta_lat, lon + delta_lon),
        (lat + delta_lat, lon - delta_lon),
        (lat + delta_lat, lon + delta_lon),
    ]

    # L'API Elevation IGN accepte une liste de points en POST JSON
    url = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json"
    payload = {
        "lon":    [c[1] for c in coins],
        "lat":    [c[0] for c in coins],
        "resource": "ign_rge_alti_wld",
        "delimiter": "|",
        "indent":    False,
        "measures":  False,
        "zonly":     True,
    }

    try:
        r = requests.post(url, json=payload, timeout=10,
                          headers={"User-Agent": "SolarIndex-Pipeline/1.0"})
        r.raise_for_status()
        data = r.json()

        elevations = data.get("elevations", [])
        if len(elevations) < 4:
            return None

        altitudes = [e.get("z", -9999) for e in elevations]
        altitudes = [a for a in altitudes if a > -9000]  # -9999 = no data

        if len(altitudes) < 2:
            return None

        delta_alt_m  = max(altitudes) - min(altitudes)
        diagonale_m  = math.sqrt((2 * rayon_m)**2 + (2 * rayon_m)**2)
        pente_pct    = (delta_alt_m / diagonale_m) * 100

        return round(pente_pct, 1)

    except requests.RequestException:
        return None
```

### Partie B : Zone ABF via Géoportail de l'Urbanisme

```python
def fetch_zone_abf(lat: float, lon: float) -> bool:
    """
    Vérifie si le point (lat, lon) est dans un périmètre ABF
    (Architecte des Bâtiments de France) ou zone de protection
    de monument historique.

    Source : Géoportail de l'Urbanisme — couche servitudes AC1/AC2
    (servitudes d'utilité publique relatives aux monuments historiques)

    URL WFS : https://wxs.ign.fr/urbanisme/geoportail/wfs
    Layer   : SERVITUDES.ACAD_SUP:AC1 (abords monuments historiques)
              SERVITUDES.ACAD_SUP:AC2 (sites patrimoniaux remarquables)

    Returns:
        True si le parking est dans une zone ABF, False sinon ou si erreur
    """
    # Requête WFS avec filtre spatial INTERSECTS
    params = {
        "SERVICE":      "WFS",
        "VERSION":      "2.0.0",
        "REQUEST":      "GetFeature",
        "TYPENAME":     "SERVITUDES.ACAD_SUP:AC1,SERVITUDES.ACAD_SUP:AC2",
        "COUNT":        "1",
        "OUTPUTFORMAT": "application/json",
        "CQL_FILTER":   (
            f"INTERSECTS(the_geom, POINT({lon} {lat}))"
        ),
    }

    try:
        r = requests.get(
            "https://wxs.ign.fr/urbanisme/geoportail/wfs",
            params=params,
            timeout=15,
            headers={"User-Agent": "SolarIndex-Pipeline/1.0"}
        )
        r.raise_for_status()
        data = r.json()

        features = data.get("features", [])
        return len(features) > 0

    except requests.RequestException:
        # En cas d'erreur → ne pas flaguer (préférer faux négatif à faux positif)
        return False
```

### Intégration dans le pipeline

```python
def apply_derogations(record: dict) -> dict:
    """
    Ajoute les flags de dérogation potentielle sur le record.
    Appelé après l'enrichissement B2B, avant l'upsert Supabase.
    """
    lat = record.get("latitude")
    lon = record.get("longitude")
    surface = record.get("surface_m2", 0)

    if not lat or not lon:
        return record

    # ── Pente ──────────────────────────────────────────────────────────────────
    pente = fetch_pente_pct(lat, lon, surface)
    record["pente_pct"] = pente

    if pente is not None and pente > 5.0:
        record["derogation_pente"] = True
        # Réduire légèrement le score de confiance
        record["score_confiance"] = max(0.3,
            (record.get("score_confiance") or 0.5) - 0.05)

    # ── Zone ABF ───────────────────────────────────────────────────────────────
    record["derogation_abf"] = fetch_zone_abf(lat, lon)

    time.sleep(0.1)  # Respecter les API IGN
    return record
```

**Affichage sur la fiche lead :**
```
Si derogation_pente = True (pente > 5%) :
  ⚠️ Pente terrain estimée : {pente_pct}%
     Une pente > 5% peut ouvrir droit à dérogation (art. R111-19-4).
     Vérification recommandée avant engagement commercial.

Si derogation_abf = True :
  ⚠️ Zone ABF / Patrimoine historique détectée
     L'installation d'ombrières dans ce périmètre peut nécessiter
     l'accord de l'Architecte des Bâtiments de France.
     Vérification obligatoire avant toute proposition au client.

Si les deux = False :
  ✅ Aucune dérogation détectée (pente {pente_pct}%, hors zone ABF)
```

**Cas limites :**
- API Elevation IGN retourne `-9999` pour les zones sans données altimétriques (rare en métropole, possible en outre-mer) → filtrer ces valeurs.
- WFS Urbanisme peut être lent ou indisponible → timeout à 15s, fallback `derogation_abf = False` (préférer faux négatif).
- Parking en zone de rénovation urbaine : les couches AC1/AC2 ne couvrent que les servitudes nationales. Les PLU locaux peuvent avoir des contraintes supplémentaires non détectables via cette API.
- Pente > 5 % ne signifie pas forcément dérogation accordée — c'est un critère d'éligibilité à la demande, pas une exemption automatique. Le wording sur la fiche doit être "peut ouvrir droit à dérogation", pas "est exempté".

---

## Ordre d'exécution dans `run_pipeline()`

```python
for el in elements:
    # ... extraction coords, surface OSM, centroïde (code existant) ...

    # Bypass 1 : surface_tag_present (inline, pas d'appel API)
    record["surface_tag_present"] = (el in elements_with_surface)

    # Bypass 2 : surface cadastrale (après avoir l'id_parcelle de l'étape 2)
    # → appelé dans l'étape enrichissement B2B, après fetch_cadastre()
    surface_retenue, source = resolve_surface(surface_osm, id_parcelle)
    record["surface_m2"]      = surface_retenue
    record["source_surface"]  = source

    # Bypass 3 : propriétaire réel (après SIREN)
    if record.get("siren"):
        prop = resolve_proprietaire(record["siren"], PAPPERS_TOKEN)
        record.update(prop)

    # Bypass 5 : dérogations (peut tourner en parallèle des autres)
    record = apply_derogations(record)

    records.append(record)

# Bypass 4 : vision — après la boucle principale, en batch
leads_urgence_libres = [
    r for r in records
    if r["flag_urgence"] == "URGENCE_ABSOLUE"
    and r["classification"] == "libre"
]
if leads_urgence_libres:
    print(f"[Vision] Lancement batch sur {len(leads_urgence_libres)} leads urgence...")
    vision_results = run_vision_batch(leads_urgence_libres)
    for r in records:
        if r["osm_id"] in vision_results:
            r = apply_vision_result(r, vision_results[r["osm_id"]])
```

## Variables d'environnement supplémentaires

```
PAPPERS_API_TOKEN=          # Clé API Pappers (compte gratuit : 100 req/min)
ANTHROPIC_API_KEY=          # Pour Haiku 4.5 vision (bypass 4)
# IGN WFS et WMS : pas de clé requise (open data)
# IGN Elevation  : pas de clé requise (open data)
```
