"""
SolarIndex Pipeline — Extraction géospatiale + Enrichissement B2B
=================================================================
1. Extrait tous les parkings en asphalte/béton >= 1500 m² d'un département (OSM/Overpass).
2. Géocodage inversé : adresse postale, code INSEE, parcelle cadastrale (API gouv).
3. Identification de l'entreprise propriétaire/exploitante (API Recherche d'entreprises).
4. Calcul du potentiel solaire (kWc + valeur chantier €) et export CSV de prospection.

Dépendances :
    pip install requests shapely pandas pyproj

Usage :
    # Étape 1 + 4 seulement (rapide) :
    python solarindex_pipeline.py --dept 33 --output leads_gironde.csv

    # Avec enrichissement cadastre + entreprise sur les meilleurs leads :
    python solarindex_pipeline.py --dept 33 --output leads_gironde.csv --enrich --max-enrich 50
"""

import argparse
import importlib
import os
import math
import json
import base64
import time
import sys
from collections import Counter
from pathlib import Path
from types import ModuleType
import requests
import pandas as pd
from shapely.geometry import Polygon
from shapely.ops import transform
from shapely.strtree import STRtree
import pyproj

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from lib.surface_thresholds import compute_flag_urgence  # noqa: E402
from lib.majic import majic_to_proprietaire  # noqa: E402


# ─── Chargement léger de .env.local (clés Anthropic / Supabase) ───────────────
def _load_dotenv(path: str = ".env.local") -> None:
    """
    Charge les variables de .env.local dans os.environ SANS écraser celles déjà
    définies dans l'environnement. Le pipeline n'a pas de dépendance dotenv ;
    Next.js charge ce fichier de son côté, mais Python doit le faire lui-même.
    """
    try:
        with open(path, "r", encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key, val = key.strip(), val.strip().strip('"').strip("'")
                if key and val and key not in os.environ:
                    os.environ[key] = val
    except OSError:
        pass


_load_dotenv(str(_ROOT / ".env.local"))

# ─── Constantes Métier ─────────────────────────────────────────────────────────
SURFACE_MIN_M2 = 1_500          # Seuil légal loi APER
SURFACE_URGENCE_M2 = 10_000     # Drapeau "Urgence Absolue"
RATIO_SOLAIRE = 0.50            # 50 % de la surface = surface utile minimum légal
M2_PAR_KWC = 5                  # 5 m² de structure pour 1 kWc (standard ombrière)
COUT_KWC_EUR = 1_200            # Coût moyen marché installation commerciale (€/kWc)

# Plusieurs serveurs miroirs Overpass : on bascule sur le suivant en cas de
# timeout (504) ou d'indisponibilité. kumi/private.coffee avant overpass-api.de
# (souvent moins saturés pour les requêtes par ID).
OVERPASS_MIRRORS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
MAX_RETRIES = 3              # Tentatives par serveur
RETRY_BACKOFF_S = 5         # Attente (croissante) entre deux tentatives
OVERPASS_GEOM_CHUNK = 20    # IDs OSM par requête géométrie (backfill) — petit = moins de 504
OVERPASS_GEOM_PAUSE_S = 3.0   # Pause entre lots géométrie (politesse API publique)

# ─── APIs publiques d'enrichissement (Étapes 2 & 3, gratuites, sans clé) ───────
API_ADRESSE_REVERSE = "https://api-adresse.data.gouv.fr/reverse/"          # BAN — géocodage inversé
API_CADASTRE_PARCELLE = "https://apicarto.ign.fr/api/cadastre/parcelle"   # IGN — parcelle cadastrale
API_RECHERCHE_ENTREPRISES = "https://recherche-entreprises.api.gouv.fr/near_point"  # SIREN simplifiée
ENRICH_PAUSE_S = 0.25        # Pause legacy entre leads (enrich_dataframe département)
ENRICH_API_PAUSE_S = 0.5     # Pause entre appels BAN / apicarto / SIREN (backfill national)
SEARCH_RADIUS_KM = 0.1       # Rayon de recherche d'entreprise autour du parking
SCORE_MIN_CONFIANCE = 0.7    # Sous ce score BAN, on déclenche le vote sur le bbox

# ─── Détection de panneaux solaires existants (Signal A + B) ──────────────────
# Registre national des installations de production (ODRÉ / RTE), API Opendatasoft.
API_ODRE_REGISTRE = (
    "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/"
    "registre-national-installation-production-stockage-electricite-agrege/records"
)
PV_REGISTRY_MIN_KW = 100     # Plancher "taille ombrière" : on ignore le résidentiel
PV_REGISTRY_BAND_LOW = 0.5   # Une install du registre "matche" le parking si sa puissance
PV_REGISTRY_BAND_HIGH = 1.5  # est dans [0.5×, 1.5×] la puissance estimée de l'ombrière
PV_OVERLAP_EQUIPE = 0.50     # Recouvrement OSM ≥ 50 % → déjà conforme (équipé)
PV_OVERLAP_MIN = 0.05        # Recouvrement OSM partiel → doute (à vérifier)
HUWART_MIN_PANEL_PCT = 17.5  # Loi n° 2025-1129 du 26 novembre 2025 (dite loi Huwart)
HUWART_SCORE_PENALTY = 0.05
VISION_COVERAGE_EQUIPE = 45.0  # Recouvrement photo > 45 % → déjà équipé (hors vente)
ODRE_PAUSE_S = 0.05          # Pause entre requêtes registre (politesse API)

# ─── Bypasses pipeline (surface cadastrale, propriétaire, vision, dérogations) ─
# NB : les anciennes URLs wxs.ign.fr sont dépréciées → Géoplateforme data.geopf.fr.
WFS_GEOPF = "https://data.geopf.fr/wfs/ows"
WMS_ORTHO_GEOPF = "https://data.geopf.fr/wms-r/ows"
ELEVATION_GEOPF = "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json"
SUP_TYPENAME = "wfs_sup:assiette_sup_s"   # servitudes d'utilité publique (surfaciques)
ORTHO_LAYER = "HR.ORTHOIMAGERY.ORTHOPHOTOS"

ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

SURFACE_RATIO_MAX = 1.5      # Écart cadastre/OSM au-delà duquel on garde l'OSM
SURFACE_RATIO_MIN = 0.3      # Parcelle trop petite vs parking OSM → mauvais match probable
PENTE_DEROGATION_PCT = 5.0   # Pente ouvrant droit à dérogation (art. R111-19-4)
VISION_MODEL = "claude-haiku-4-5-20251001"

# Catégories juridiques INSEE à exclure (acteurs publics) : préfixe "7" = administrations
# publiques / collectivités, "4" = établissements publics (gares SNCF, hôpitaux publics…).
CATEGORIES_JURIDIQUES_PUBLIQUES = ("7", "4")

# Codes NAF à forte valeur pour la prospection ombrières (loi APER).
NAF_PRIORITAIRES = {
    "4711F": "Grande distribution (hypermarché)",
    "4711D": "Grande distribution (supermarché)",
    "4711C": "Supérette / distribution alimentaire",
    "4719B": "Grand magasin non spécialisé",
    "5210B": "Entreposage & logistique",
    "5224A": "Manutention portuaire / logistique",
    "8610Z": "Clinique / hôpital privé",
    "4941A": "Transport routier de fret",
    "2511Z": "Industrie (construction métallique)",
    "1071C": "Industrie agroalimentaire",
}

# Transformateur WGS84 (EPSG:4326) -> Lambert-93 (EPSG:2154), API moderne pyproj.
# always_xy=True : on travaille en (longitude, latitude), comme nos polygones OSM.
_TRANSFORMER_L93 = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)

# ─── Requête Overpass QL ───────────────────────────────────────────────────────
def build_overpass_query(dept_id: str) -> str:
    """
    Construit la requête Overpass QL pour extraire les parkings d'un département.
    On cible :
      - amenity=parking  (tag principal)
      - surface dans {asphalt, concrete, paved}  (revêtements durs)
    On utilise l'aire administrative OSM du département via {{geocodeArea}}.
    """
    query = f"""
[out:json][timeout:120];
// Résolution de l'aire du département {dept_id}
area["ref:INSEE"~"^{dept_id}"]["admin_level"="6"]->.searchArea;
(
  // Polygones fermés (ways)
  way["amenity"="parking"]["surface"~"^(asphalt|concrete|paved)$"](area.searchArea);
  // Relations multipolygones (grands parkings complexes)
  relation["amenity"="parking"]["surface"~"^(asphalt|concrete|paved)$"](area.searchArea);
);
out geom;
"""
    return query.strip()


def build_overpass_query_no_surface(dept_id: str) -> str:
    """
    Bypass 1 — Requête complémentaire : parkings SANS tag `surface`.
    Beaucoup de parkings existent dans OSM sans `surface=*` (contributeur qui ne
    l'a pas renseigné, ou import automatique). On les capture en excluant
    explicitement ceux qui ont déjà un tag surface (déjà couverts, ou surface
    inintéressante type grass) pour éviter les doublons.
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


def build_solar_query(dept_id: str) -> str:
    """
    Requête Overpass des installations photovoltaïques d'un département (Signal A).
    On cible les générateurs et centrales solaires cartographiés dans OSM :
      - power=generator + generator:source=solar
      - power=plant     + plant:source=solar
    On ne garde que les ways/relations (surfaces) — les nodes (panneau isolé)
    n'ont pas de géométrie exploitable pour le recouvrement.
    """
    query = f"""
[out:json][timeout:120];
area["ref:INSEE"~"^{dept_id}"]["admin_level"="6"]->.searchArea;
(
  way["power"="generator"]["generator:source"="solar"](area.searchArea);
  relation["power"="generator"]["generator:source"="solar"](area.searchArea);
  way["power"="plant"]["plant:source"="solar"](area.searchArea);
  relation["power"="plant"]["plant:source"="solar"](area.searchArea);
);
out geom;
"""
    return query.strip()


# ─── Récupération Overpass robuste (miroirs + retries) ────────────────────────
def fetch_overpass(query: str, *, verbose: bool = True) -> list[dict]:
    """
    Envoie la requête Overpass en basculant sur plusieurs serveurs miroirs et
    en réessayant en cas d'erreur transitoire (504, 502, timeout réseau).

    verbose=False : logs réduits (backfill géométries — moins de bruit sur les 504).

    Returns:
        La liste des éléments OSM ("elements").
    Raises:
        RuntimeError si tous les serveurs échouent.
    """
    last_error = None
    for mirror in OVERPASS_MIRRORS:
        host = mirror.split("/")[2]
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                if verbose:
                    print(f"    → Serveur {host} (tentative {attempt}/{MAX_RETRIES})...")
                response = requests.post(
                    mirror,
                    data={"data": query},
                    timeout=300,
                    headers={"User-Agent": "SolarIndex-Pipeline/1.0"},
                )
                # 504/502/429 = surcharge serveur : on réessaie / on bascule
                if response.status_code in (429, 502, 503, 504):
                    last_error = f"{response.status_code} sur {host}"
                    if verbose:
                        print(f"      ⏳ {response.status_code} (serveur saturé), nouvel essai...")
                    time.sleep(RETRY_BACKOFF_S * attempt)
                    continue
                response.raise_for_status()
                return response.json().get("elements", [])
            except requests.RequestException as e:
                last_error = str(e)
                if verbose:
                    print(f"      ⚠️  {e}")
                time.sleep(RETRY_BACKOFF_S * attempt)
        if verbose:
            print(f"    ✗ {host} indisponible, passage au serveur suivant.")
        elif last_error:
            print(f"    ⏳ Overpass saturé ({host}) → miroir suivant…")

    raise RuntimeError(
        f"Tous les serveurs Overpass ont échoué. Dernière erreur : {last_error}. "
        "Réessayez plus tard ou ciblez une zone plus petite."
    )


# ─── Calcul de Surface Géodésique ─────────────────────────────────────────────
def geodesic_area_m2(coords: list[tuple[float, float]]) -> float:
    """
    Calcule la surface réelle en m² d'un polygone exprimé en (lon, lat) WGS84.
    
    Méthode : projection Lambert-93 (EPSG:2154, système officiel France),
    puis calcul de surface Euclidien sur la géométrie projetée.
    Cette approche est précise pour la France métropolitaine.
    
    Args:
        coords: Liste de tuples (longitude, latitude)
    
    Returns:
        Surface en m²
    """
    if len(coords) < 3:
        return 0.0

    poly_wgs84 = Polygon(coords)
    if not poly_wgs84.is_valid:
        poly_wgs84 = poly_wgs84.buffer(0)  # Auto-correction topologique

    # Projection WGS84 -> Lambert-93 (mètres) via l'API moderne pyproj.Transformer.
    poly_lambert = transform(_TRANSFORMER_L93.transform, poly_wgs84)
    return poly_lambert.area


# ─── Extraction des Coordonnées OSM ───────────────────────────────────────────
def extract_coords_from_element(element: dict) -> list[tuple[float, float]]:
    """
    Extrait les coordonnées (lon, lat) depuis un élément OSM (way ou relation).
    Pour les relations, on prend le premier outer ring.
    """
    if element["type"] == "way":
        geometry = element.get("geometry", [])
        return [(node["lon"], node["lat"]) for node in geometry]

    elif element["type"] == "relation":
        for member in element.get("members", []):
            if member.get("role") == "outer" and "geometry" in member:
                return [(node["lon"], node["lat"]) for node in member["geometry"]]
    return []


# ─── Calcul du Centroïde ──────────────────────────────────────────────────────
def centroid_from_coords(coords: list[tuple[float, float]]) -> tuple[float, float]:
    """Retourne (latitude, longitude) du centroïde du polygone."""
    if len(coords) < 3:
        return (0.0, 0.0)
    poly = Polygon(coords)
    if not poly.is_valid:
        poly = poly.buffer(0)
    c = poly.centroid
    return (c.y, c.x)  # (lat, lon)


# ─── Bounding box du polygone ─────────────────────────────────────────────────
def bbox_from_coords(coords: list[tuple[float, float]]) -> tuple[float, float, float, float]:
    """Retourne (min_lat, min_lon, max_lat, max_lon) du polygone."""
    if len(coords) < 3:
        return (0.0, 0.0, 0.0, 0.0)
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return (min(lats), min(lons), max(lats), max(lons))


# ─── Moteur de Valorisation ───────────────────────────────────────────────────
def compute_solar_potential(surface_m2: float) -> dict:
    """
    Calcule le potentiel solaire et la valeur commerciale estimée.
    
    Formules :
        S_solaire = surface × 50%          (obligation légale minimale)
        P_kWc     = S_solaire / 5          (5 m² / kWc pour ombrière)
        Valeur_€  = P_kWc × 1200 €/kWc    (prix marché installation commerciale)
    """
    s_solaire = surface_m2 * RATIO_SOLAIRE
    p_kwc = s_solaire / M2_PAR_KWC
    valeur_eur = p_kwc * COUT_KWC_EUR
    return {
        "surface_solaire_m2": round(s_solaire, 1),
        "puissance_kwc": round(p_kwc, 1),
        "valeur_chantier_eur": round(valeur_eur, 0),
    }


# ─── Helper HTTP générique (tolérant aux erreurs) ─────────────────────────────
def _get_json(url: str, params: dict, timeout: int = 20) -> dict | None:
    """GET JSON avec gestion d'erreur silencieuse (retourne None si échec)."""
    try:
        r = requests.get(
            url, params=params, timeout=timeout,
            headers={"User-Agent": "SolarIndex-Pipeline/1.0"},
        )
        if r.status_code != 200:
            return None
        return r.json()
    except (requests.RequestException, ValueError):
        return None


# ─── Étape 2a : Géocodage inversé (adresse postale + code INSEE) ──────────────
def _reverse_one(lat: float, lon: float) -> dict | None:
    """Un seul appel BAN. Retourne {label, citycode, city, score} ou None."""
    data = _get_json(API_ADRESSE_REVERSE, {"lat": lat, "lon": lon})
    if not data or not data.get("features"):
        return None
    props = data["features"][0].get("properties", {})
    return {
        "label": props.get("label", ""),
        "citycode": props.get("citycode", ""),
        "city": props.get("city", ""),
        "score": float(props.get("score", 0.0) or 0.0),
    }


def reverse_geocode_bulk(points: list[tuple[float, float]]) -> list[str]:
    """
    Géocodage inversé EN MASSE via l'API CSV de la BAN : un seul appel HTTP
    renvoie le code INSEE de tous les points (≈10× plus rapide que point par point).
    Retourne la liste des codes INSEE (citycode) dans le même ordre. Chaîne vide
    si un point n'a pas pu être résolu.
    """
    import csv
    import io

    if not points:
        return []
    results: list[str] = []
    CHUNK = 1000
    for start in range(0, len(points), CHUNK):
        batch = points[start:start + CHUNK]
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["latitude", "longitude"])
        for la, lo in batch:
            writer.writerow([la, lo])
        try:
            resp = requests.post(
                "https://api-adresse.data.gouv.fr/reverse/csv/",
                files={"data": ("points.csv", buf.getvalue(), "text/csv")},
                data={"result_columns": "result_citycode"},
                timeout=180,
                headers={"User-Agent": "SolarIndex-Pipeline/1.0"},
            )
            resp.raise_for_status()
            reader = csv.DictReader(io.StringIO(resp.text))
            rows = list(reader)
            if len(rows) != len(batch):
                # Désynchronisation improbable : on neutralise ce lot.
                results.extend([""] * len(batch))
                continue
            results.extend((r.get("result_citycode") or "").strip() for r in rows)
        except (requests.RequestException, ValueError, csv.Error):
            results.extend([""] * len(batch))
    return results


def reverse_geocode(lat: float, lon: float,
                    bbox: tuple[float, float, float, float] | None = None) -> dict:
    """
    Base Adresse Nationale (BAN) : adresse postale + code INSEE du centroïde.

    Fallback grands parkings : si le score de confiance du centroïde est < 0.7,
    on interroge aussi les 4 coins du bounding box et on retient le code INSEE
    majoritaire (vote), puis la meilleure adresse appartenant à cette commune.
    Cela évite de récupérer l'adresse de la parcelle voisine.
    """
    vide = {"adresse_cadastre": "", "code_insee": "", "ville_ban": "",
            "geocode_score": 0.0, "geocode_methode": ""}

    centre = _reverse_one(lat, lon)
    if centre and centre["score"] >= SCORE_MIN_CONFIANCE:
        return {
            "adresse_cadastre": centre["label"],
            "code_insee": centre["citycode"],
            "ville_ban": centre["city"],
            "geocode_score": round(centre["score"], 2),
            "geocode_methode": "centroïde",
        }

    # Score faible (ou pas de résultat) → on échantillonne les 4 coins du bbox.
    points = []
    if bbox and bbox != (0.0, 0.0, 0.0, 0.0):
        min_lat, min_lon, max_lat, max_lon = bbox
        points = [
            (min_lat, min_lon), (min_lat, max_lon),
            (max_lat, min_lon), (max_lat, max_lon),
        ]

    resultats = [centre] if centre else []
    for la, lo in points:
        r = _reverse_one(la, lo)
        if r:
            resultats.append(r)
        time.sleep(0.05)  # BAN : on reste poli sur le débit

    if not resultats:
        return vide

    # Vote majoritaire sur le code INSEE renvoyé par les différents points.
    votes = Counter(r["citycode"] for r in resultats if r["citycode"])
    if not votes:
        return vide
    insee_gagnant = votes.most_common(1)[0][0]

    # Meilleure adresse (score max) parmi les points de la commune gagnante.
    candidats = [r for r in resultats if r["citycode"] == insee_gagnant]
    meilleur = max(candidats, key=lambda r: r["score"])
    return {
        "adresse_cadastre": meilleur["label"],
        "code_insee": insee_gagnant,
        "ville_ban": meilleur["city"],
        "geocode_score": round(meilleur["score"], 2),
        "geocode_methode": f"vote_bbox ({votes[insee_gagnant]}/{sum(votes.values())})",
    }


# ─── Étape 2b : Identifiant de parcelle cadastrale (IGN apicarto) ─────────────
def _parcelle_props_from_feature(feat: dict) -> dict | None:
    """Extrait idu + contenance d'une feature GeoJSON apicarto."""
    props = feat.get("properties", {})
    idu = props.get("idu") or (
        f"{props.get('code_dep', '')}{props.get('code_com', '')}"
        f"{props.get('section', '')}{props.get('numero', '')}"
    )
    if not idu:
        return None
    try:
        contenance = (
            float(props.get("contenance"))
            if props.get("contenance") is not None
            else None
        )
    except (TypeError, ValueError):
        contenance = None
    return {"idu": idu, "contenance": contenance}


def _parcelle_one(lat: float, lon: float) -> dict | None:
    """Un point → parcelle apicarto ({idu, contenance}) ou None."""
    geom = f'{{"type":"Point","coordinates":[{lon},{lat}]}}'
    data = _get_json(API_CADASTRE_PARCELLE, {"geom": geom})
    if not data or not data.get("features"):
        return None
    return _parcelle_props_from_feature(data["features"][0])


def _parcelles_in_polygon(coords: list[tuple[float, float]]) -> list[dict]:
    """
    Parcelles cadastrales intersectant le polygone parking (coords lon, lat).
    Bypass multi-parcelle : somme les contenances et retient la parcelle principale.
    """
    if len(coords) < 3:
        return []
    ring = [[lon, lat] for lon, lat in coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    geom = json.dumps({"type": "Polygon", "coordinates": [ring]}, separators=(",", ":"))
    data = _get_json(API_CADASTRE_PARCELLE, {"geom": geom}, timeout=45)
    if not data or not data.get("features"):
        return []
    out: list[dict] = []
    seen: set[str] = set()
    for feat in data["features"]:
        p = _parcelle_props_from_feature(feat)
        if p and p["idu"] not in seen:
            seen.add(p["idu"])
            out.append(p)
    return out


def _merge_parcelles_hits(parcels: list[dict], lat: float, lon: float) -> dict:
    """Fusionne plusieurs parcelles : idu principal + somme des contenances."""
    if not parcels:
        return {"id_parcelle": "", "parcelle_methode": "", "surface_cadastrale_m2": None}

    primary = parcels[0]
    centre = _parcelle_one(lat, lon)
    if centre:
        for p in parcels:
            if p["idu"] == centre["idu"]:
                primary = p
                break
    else:
        with_cont = [p for p in parcels if p.get("contenance")]
        if with_cont:
            primary = max(with_cont, key=lambda p: p["contenance"] or 0)

    contenances = [p["contenance"] for p in parcels if p.get("contenance")]
    surface_sum = round(sum(contenances), 1) if contenances else primary.get("contenance")

    if len(parcels) == 1:
        methode = "polygone OSM"
    else:
        methode = f"multi_parcelle ({len(parcels)} parcelles)"

    return {
        "id_parcelle": primary["idu"],
        "parcelle_methode": methode,
        "surface_cadastrale_m2": surface_sum,
    }


def get_parcelle(lat: float, lon: float,
                 bbox: tuple[float, float, float, float] | None = None,
                 polygon_coords: list[tuple[float, float]] | None = None) -> dict:
    """
    API Carto IGN (couche Cadastre) : identifiant unique (IDU) de la parcelle.

    Fallback grands parkings : si le centroïde ne tombe sur aucune parcelle
    (zone non cadastrée, voirie…), on interroge les 4 coins du bounding box et
    on retient l'IDU majoritaire (vote) — utile quand un grand parking déborde
    sur plusieurs parcelles ou que le centroïde tombe sur du domaine public.

    Si `polygon_coords` est fourni (géométrie OSM du parking), interroge d'abord
    toutes les parcelles intersectant le polygone (multi-parcelle).
    """
    vide = {"id_parcelle": "", "parcelle_methode": "", "surface_cadastrale_m2": None}

    if polygon_coords and len(polygon_coords) >= 3:
        multi = _parcelles_in_polygon(polygon_coords)
        if multi:
            return _merge_parcelles_hits(multi, lat, lon)

    centre = _parcelle_one(lat, lon)
    if centre:
        return {"id_parcelle": centre["idu"], "parcelle_methode": "centroïde",
                "surface_cadastrale_m2": centre["contenance"]}

    points = []
    if bbox and bbox != (0.0, 0.0, 0.0, 0.0):
        min_lat, min_lon, max_lat, max_lon = bbox
        points = [
            (min_lat, min_lon), (min_lat, max_lon),
            (max_lat, min_lon), (max_lat, max_lon),
        ]

    hits = []
    for la, lo in points:
        r = _parcelle_one(la, lo)
        if r:
            hits.append(r)
        time.sleep(0.05)

    if not hits:
        return vide

    votes = Counter(h["idu"] for h in hits)
    gagnant = votes.most_common(1)[0][0]
    contenance = next((h["contenance"] for h in hits if h["idu"] == gagnant), None)
    return {
        "id_parcelle": gagnant,
        "parcelle_methode": f"vote_bbox ({votes[gagnant]}/{len(hits)})",
        "surface_cadastrale_m2": contenance,
    }


# ─── Bypass 2 : surface retenue pour le calcul APER (cadastre vs OSM) ─────────
def resolve_surface(surface_osm: float,
                    surface_cadastrale: float | None) -> tuple[float, str]:
    """
    Détermine la surface qui fait foi pour le seuil légal (1 500 m²) et le kWc.

    La surface OSM sert à la DÉTECTION ; la surface cadastrale (contenance IGN)
    fait foi pour l'éligibilité APER quand elle est cohérente.

    Garde-fou : si l'écart cadastre/OSM est aberrant (> 1,5× ou < 0,3×), c'est
    probablement une mauvaise correspondance de parcelle (terrain englobant le
    parking, ou parcelle bien plus petite) → on retombe sur l'OSM.

    Returns: (surface_retenue_m2, source) avec source ∈
             {'osm', 'cadastre', 'osm_fallback'}.
    """
    if surface_cadastrale is None or surface_cadastrale <= 0:
        return surface_osm, "osm_fallback"
    ratio = surface_cadastrale / surface_osm if surface_osm > 0 else 1.0
    if ratio > SURFACE_RATIO_MAX or ratio < SURFACE_RATIO_MIN:
        return surface_osm, "osm_fallback"
    return round(surface_cadastrale, 1), "cadastre"


# ─── Étape 3 : Identification de l'entreprise (API Recherche d'entreprises) ───
def search_company(lat: float, lon: float) -> dict:
    """
    API Recherche d'entreprises (SIREN simplifiée, gratuite, sans clé).
    Cherche les établissements dont le siège est proche du parking, exclut les
    acteurs publics, et privilégie les codes NAF à forte valeur (loi APER).
    """
    vide = {
        "siren": "", "raison_sociale": "", "code_naf": "",
        "libelle_naf": "", "secteur_cible": "", "naf_prioritaire": False,
    }
    data = _get_json(API_RECHERCHE_ENTREPRISES, {
        "lat": lat, "long": lon, "radius": SEARCH_RADIUS_KM, "per_page": 25,
    })
    if not data or not data.get("results"):
        return vide

    candidats = []
    for ent in data["results"]:
        nat_jur = str(ent.get("nature_juridique") or "")
        # Exclusion des entités publiques (mairies, gares, hôpitaux publics…)
        if nat_jur.startswith(CATEGORIES_JURIDIQUES_PUBLIQUES):
            continue
        naf = (ent.get("activite_principale") or "")
        naf_norm = naf.replace(".", "").upper()
        candidats.append((ent, naf, naf_norm, naf_norm in NAF_PRIORITAIRES))

    if not candidats:
        return vide

    # Priorité aux entreprises dont le NAF est dans notre cible commerciale.
    candidats.sort(key=lambda c: not c[3])
    ent, naf, naf_norm, prioritaire = candidats[0]
    return {
        "siren": ent.get("siren", ""),
        "raison_sociale": ent.get("nom_complet") or ent.get("nom_raison_sociale", ""),
        "code_naf": naf,
        "libelle_naf": NAF_PRIORITAIRES.get(naf_norm, ent.get("section_activite_principale", "")),
        "secteur_cible": NAF_PRIORITAIRES.get(naf_norm, ""),
        "naf_prioritaire": prioritaire,
    }


# ─── Détection PV — Signal A : recouvrement géométrique OSM ───────────────────
def _polygon_l93(coords: list[tuple[float, float]]) -> Polygon | None:
    """Construit un polygone projeté en Lambert-93 (m) à partir de (lon, lat)."""
    if len(coords) < 3:
        return None
    poly = Polygon(coords)
    if not poly.is_valid:
        poly = poly.buffer(0)
    poly = transform(_TRANSFORMER_L93.transform, poly)
    if poly.is_empty or poly.area <= 0:
        return None
    return poly


def fetch_solar_index(dept_id: str) -> tuple[STRtree | None, list[Polygon]]:
    """
    Récupère les centrales/ombrières PV du département (OSM) et les projette,
    puis construit un index spatial (STRtree) pour des tests de recouvrement
    rapides contre les milliers de parkings.
    """
    print("    🔆 Récupération des installations PV (OSM) pour le recouvrement...")
    try:
        elements = fetch_overpass(build_solar_query(dept_id))
    except RuntimeError as e:
        print(f"      ⚠️  Échec requête PV ({e}). Signal A désactivé pour ce dept.")
        return None, []
    polys = []
    for el in elements:
        poly = _polygon_l93(extract_coords_from_element(el))
        if poly is not None:
            polys.append(poly)
    print(f"      → {len(polys)} installations PV cartographiées.")
    if not polys:
        return None, []
    return STRtree(polys), polys


def fetch_parking_geoms_by_osm_ids(
    osm_ids: list[int],
    chunk_size: int = OVERPASS_GEOM_CHUNK,
    *,
    verbose: bool = False,
    persist: bool = True,
    geom_pause: float | None = None,
) -> dict[int, list[tuple[float, float]]]:
    """
    Géométries parking (lon, lat) par osm_id — pour backfill multi-parcelle.

    - Lots petits (défaut 20 ids) pour limiter les 504
    - Cache disque data/cache/osm_geoms.json (reprises sans re-taper Overpass)
    - Si un lot échoue : split automatique en deux sous-lots
    """
    cache = _load_osm_geom_cache()
    missing = [int(x) for x in osm_ids if int(x) not in cache]
    pause = OVERPASS_GEOM_PAUSE_S if geom_pause is None else geom_pause
    if missing:
        for i in range(0, len(missing), chunk_size):
            chunk = missing[i : i + chunk_size]
            cache.update(_fetch_geom_chunk(chunk, verbose=verbose))
            if persist:
                _save_osm_geom_cache(cache)
            time.sleep(pause)
    return {int(oid): cache[int(oid)] for oid in osm_ids if int(oid) in cache}


_osm_geom_disk_cache: dict[int, list[tuple[float, float]]] | None = None


def _osm_geom_cache_path() -> Path:
    return _ROOT / "data" / "cache" / "osm_geoms.json"


def _load_osm_geom_cache() -> dict[int, list[tuple[float, float]]]:
    global _osm_geom_disk_cache
    if _osm_geom_disk_cache is not None:
        return _osm_geom_disk_cache
    out: dict[int, list[tuple[float, float]]] = {}
    path = _osm_geom_cache_path()
    try:
        if path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
            for key, coords in raw.items():
                if isinstance(coords, list) and len(coords) >= 3:
                    out[int(key)] = [(float(lon), float(lat)) for lon, lat in coords]
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        out = {}
    _osm_geom_disk_cache = out
    return out


def _save_osm_geom_cache(cache: dict[int, list[tuple[float, float]]]) -> None:
    path = _osm_geom_cache_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    serial = {str(k): v for k, v in cache.items()}
    path.write_text(json.dumps(serial, separators=(",", ":")), encoding="utf-8")


def _overpass_geom_query(ids: list[int]) -> str:
    ids_s = ",".join(str(x) for x in ids)
    return f"""
[out:json][timeout:180];
(
  way(id:{ids_s});
  relation(id:{ids_s});
);
out geom;
""".strip()


def _fetch_geom_chunk(
    ids: list[int],
    *,
    verbose: bool = False,
) -> dict[int, list[tuple[float, float]]]:
    """Un lot d'IDs OSM ; en cas d'échec total, split récursif en deux."""
    if not ids:
        return {}
    try:
        out: dict[int, list[tuple[float, float]]] = {}
        for el in fetch_overpass(_overpass_geom_query(ids), verbose=verbose):
            oid = el.get("id")
            coords = extract_coords_from_element(el)
            if oid is not None and coords:
                out[int(oid)] = coords
        return out
    except RuntimeError:
        if len(ids) <= 1:
            if verbose:
                print(f"      ⚠️  géométrie osm_id={ids[0]} introuvable (Overpass)")
            return {}
        mid = len(ids) // 2
        if not verbose:
            print(f"    ↳ lot {len(ids)} ids saturé → split {mid}+{len(ids) - mid}")
        return {
            **_fetch_geom_chunk(ids[:mid], verbose=verbose),
            **_fetch_geom_chunk(ids[mid:], verbose=verbose),
        }


def parking_polygon_l93(
    lat: float, lon: float, surface_m2: float,
    coords: list[tuple[float, float]] | None,
) -> Polygon | None:
    """Polygone parking en L93 ; cercle équivalent si géométrie OSM absente."""
    if coords:
        return _polygon_l93(coords)
    r = math.sqrt(max(surface_m2, 1) / math.pi)
    dlat = r / 111_000
    dlon = r / (111_000 * math.cos(math.radians(lat)))
    ring = [
        (lon - dlon, lat - dlat),
        (lon + dlon, lat - dlat),
        (lon + dlon, lat + dlat),
        (lon - dlon, lat + dlat),
        (lon - dlon, lat - dlat),
    ]
    return _polygon_l93(ring)


def merge_detection_with_vision(
    osm_detection: str,
    vision_flag: bool | None,
    vision_confidence: float | None,
    vision_surface_couverte_pct: float | None = None,
) -> str:
    """Fusionne détection OSM et signal vision (photo > 45 % → équipé)."""
    if osm_detection == "equipe":
        return "equipe"
    if vision_surface_couverte_pct is not None and vision_surface_couverte_pct > VISION_COVERAGE_EQUIPE:
        return "equipe"
    if osm_detection == "a_verifier":
        return "a_verifier"
    if vision_flag and (vision_confidence or 0) >= 0.70:
        return "a_verifier"
    return "libre"


def pv_overlap_ratio(parking_l93: Polygon, tree: STRtree | None,
                     polys: list[Polygon]) -> float:
    """Ratio (0..1) de la surface du parking recouverte par des panneaux OSM."""
    if tree is None or parking_l93 is None or parking_l93.area <= 0:
        return 0.0
    inter_total = 0.0
    for idx in tree.query(parking_l93):
        try:
            inter_total += parking_l93.intersection(polys[int(idx)]).area
        except Exception:
            continue
    return min(1.0, inter_total / parking_l93.area)


# ─── Détection PV — Signal B : registre national ODRÉ (par commune) ───────────
_odre_cache: dict[str, list[float]] = {}


def registry_solar_powers(insee: str) -> list[float] | None:
    """
    Puissances (kW) des installations solaires en service ≥ PV_REGISTRY_MIN_KW de
    la commune (registre officiel ODRÉ). Mis en cache par INSEE. None si inconnu.
    """
    if not insee:
        return None
    if insee in _odre_cache:
        return _odre_cache[insee]
    where = (
        f'codeinseecommune="{insee}" and filiere="Solaire" '
        f'and regime="En service" and puismaxinstallee>={PV_REGISTRY_MIN_KW}'
    )
    data = _get_json(API_ODRE_REGISTRE, {
        "where": where, "select": "puismaxinstallee", "limit": 100,
    })
    if not data:
        return None
    powers = [
        float(r["puismaxinstallee"])
        for r in data.get("results", [])
        if r.get("puismaxinstallee") is not None
    ]
    _odre_cache[insee] = powers
    time.sleep(ODRE_PAUSE_S)
    return powers


def registry_match_count(parking_kwc: float, powers: list[float] | None) -> int:
    """
    Nombre d'installations du registre dont la puissance est cohérente avec une
    ombrière sur CE parking (bande [0.5×, 1.5×] la puissance estimée). Retourne -1
    si la commune n'a pas pu être interrogée.
    """
    if powers is None:
        return -1
    if parking_kwc <= 0:
        return 0
    low = parking_kwc * PV_REGISTRY_BAND_LOW
    high = parking_kwc * PV_REGISTRY_BAND_HIGH
    return sum(1 for p in powers if low <= p <= high)


def classify_detection(overlap: float, reg_match: int) -> str:
    """
    Statut de détection, piloté par le SEUL signal géométrique (OSM) :
      - 'equipe'     : recouvrement OSM ≥ 50 % (déjà conforme → hors vente)
      - 'a_verifier' : recouvrement OSM partiel (doute géométrique réel)
      - 'libre'      : aucun recouvrement géométrique

    Le registre ODRÉ (`reg_match`) n'entre PLUS dans la classification : il est
    purement communal (aucune coordonnée ni IRIS fiable dans le jeu agrégé), donc
    la co-occurrence d'une installation dans la commune ne dit rien d'un parking
    précis. On conserve `pv_registry_count` à titre informatif seulement, sans
    jamais bloquer une vente.
    """
    if overlap >= PV_OVERLAP_EQUIPE:
        return "equipe"
    if overlap >= PV_OVERLAP_MIN:
        return "a_verifier"
    return "libre"


def huwart_coverage_pct(record: dict) -> float | None:
    """Recouvrement ombrière % (OSM, ou photo IGN pour urgences analysées)."""
    flag = str(record.get("flag_urgence", ""))
    if "URGENCE_ABSOLUE" in flag and record.get("vision_checked_at"):
        raw = record.get("vision_surface_couverte_pct")
        return float(raw) if raw is not None else None
    overlap = record.get("pv_overlap_pct")
    if overlap is not None:
        return float(overlap) * 100.0
    return None


def apply_huwart_adjustment(record: dict) -> dict:
    """
    Loi n° 2025-1129 du 26 novembre 2025 (dite loi Huwart) : recouvrement ≥ 17,5 % →
    conformité partielle possible (mix panneaux + végétalisation), non détectable
    automatiquement → baisse du score.
    """
    coverage_pct = huwart_coverage_pct(record)
    if coverage_pct is None or coverage_pct < HUWART_MIN_PANEL_PCT:
        return record
    record["type_solution_recherchee"] = "mixte_pv_vegetal"
    if record.get("detection") == "equipe":
        return record
    vision_pct = record.get("vision_surface_couverte_pct")
    if vision_pct is not None and vision_pct > VISION_COVERAGE_EQUIPE:
        return record
    overlap = record.get("pv_overlap_pct")
    if overlap is not None and overlap >= PV_OVERLAP_EQUIPE:
        return record
    record["score_confiance"] = max(
        0.3, (record.get("score_confiance") or 0.5) - HUWART_SCORE_PENALTY,
    )
    return record


# ─── Bypass 3 : propriétaire foncier (MAJIC DGFiP, jointure parcelle open data) ─
_majic_lookup_cache: dict[str, dict] = {}


def _lookup_majic_row(id_parcelle: str) -> dict | None:
    """Lit majic_proprietaires via Supabase REST (table chargée par load_majic_parquet.py)."""
    base = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        return None
    try:
        r = requests.get(
            f"{base}/rest/v1/majic_proprietaires",
            params={
                "select": "id_parcelle,denomination,siren",
                "id_parcelle": f"eq.{id_parcelle}",
                "limit": 1,
            },
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=20,
        )
        if r.status_code != 200:
            return None
        rows = r.json()
        return rows[0] if rows else None
    except requests.RequestException:
        return None


def resolve_proprietaire_foncier(
    id_parcelle: str,
    cache: dict[str, dict] | None = None,
) -> dict:
    """
    Jointure locale sur majic_proprietaires (Parquet DGFiP pré-chargé en base).
    Zéro API payante — le fichier MAJIC ne liste que les personnes morales.
    """
    ref = (id_parcelle or "").strip()
    empty = {
        "proprietaire_foncier": None,
        "siren_proprietaire_foncier": None,
    }
    if not ref:
        return empty

    store = cache if cache is not None else _majic_lookup_cache
    if ref in store:
        return store[ref]

    row = _lookup_majic_row(ref)
    result = majic_to_proprietaire(row)
    store[ref] = result
    return result


# ─── Bypass 5 : dérogations APER (pente terrain + zone ABF) ───────────────────
def fetch_pente_pct(lat: float, lon: float, surface_m2: float) -> float | None:
    """
    Estime la pente moyenne du terrain : altitude (RGE ALTI 1 m, Géoplateforme)
    aux 4 coins du bbox du parking → (Δalt max-min) / diagonale, en %.
    """
    if surface_m2 <= 0:
        return None
    rayon_m = math.sqrt(surface_m2 / math.pi)
    dlat = rayon_m / 111_000
    dlon = rayon_m / (111_000 * math.cos(math.radians(lat)))
    coins = [(lat - dlat, lon - dlon), (lat - dlat, lon + dlon),
             (lat + dlat, lon - dlon), (lat + dlat, lon + dlon)]
    lons = "|".join(f"{c[1]:.6f}" for c in coins)
    lats = "|".join(f"{c[0]:.6f}" for c in coins)
    data = _get_json(ELEVATION_GEOPF, {
        "lon": lons, "lat": lats, "resource": "ign_rge_alti_wld",
        "delimiter": "|", "zonly": "true",
    })
    if not data:
        return None
    alts = [a for a in data.get("elevations", []) if isinstance(a, (int, float)) and a > -9000]
    if len(alts) < 2:
        return None
    diagonale = math.sqrt((2 * rayon_m) ** 2 + (2 * rayon_m) ** 2)
    if diagonale <= 0:
        return None
    pente = round((max(alts) - min(alts)) / diagonale * 100, 1)
    # Valeurs > 100 % = bruit altimétrique (DOM-TOM, falaises) → ignorer.
    return pente if pente <= 100 else None


def fetch_zone_abf(lat: float, lon: float) -> bool:
    """
    Vrai si le point est dans une servitude monument historique / patrimoine
    (SUP de type AC1 abords MH, AC2 sites patrimoniaux). Source : couche SUP
    surfacique de la Géoplateforme. On interroge par bbox serré (évite le nom de
    colonne géométrie) puis on filtre `suptype` côté client. False si erreur
    (on préfère un faux négatif à un faux positif).
    """
    d = 0.00012  # ~13 m autour du point
    bbox = f"{lat - d},{lon - d},{lat + d},{lon + d},urn:ogc:def:crs:EPSG::4326"
    data = _get_json(WFS_GEOPF, {
        "SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature",
        "TYPENAMES": SUP_TYPENAME, "OUTPUTFORMAT": "application/json",
        "SRSNAME": "urn:ogc:def:crs:EPSG::4326", "BBOX": bbox, "COUNT": 50,
    }, timeout=15)
    if not data:
        return False
    for f in data.get("features", []):
        sup = str(f.get("properties", {}).get("suptype", "")).lower()
        if sup in ("ac1", "ac2"):
            return True
    return False


def apply_derogations(record: dict) -> dict:
    """Ajoute pente_pct / derogation_pente / derogation_abf au record (bypass 5)."""
    lat, lon = record.get("latitude"), record.get("longitude")
    surface = record.get("surface_m2", 0) or 0
    if not lat or not lon:
        return record
    pente = fetch_pente_pct(lat, lon, surface)
    record["pente_pct"] = pente
    if pente is not None and pente > PENTE_DEROGATION_PCT:
        record["derogation_pente"] = True
        record["score_confiance"] = max(0.3, (record.get("score_confiance") or 0.5) - 0.05)
    record["derogation_abf"] = fetch_zone_abf(lat, lon)
    time.sleep(0.1)
    return record


# ─── Bypass 4 : validation vision ombrières (orthophoto IGN + Claude Haiku) ────
VISION_PROMPT = """Tu analyses une orthophoto aérienne d'un parking extérieur en France.
Mission : détecter la présence d'ombrières photovoltaïques (structures couvrant le parking).
Indices : structures métalliques régulières surélevées, rangées parallèles de panneaux
au-dessus des places, ombres portées régulières, texture différente du bitume nu.
Ne pas confondre avec : bâtiments adjacents, arbres, marquages au sol, PV au sol sans structure.
Réponds UNIQUEMENT en JSON valide :
{"ombriere_detectee": true|false, "confidence": 0.0-1.0, "surface_couverte_pct": 0-100, "notes": "max 100 chars"}"""


def _ortho_view(lat: float, lon: float, surface_m2: float,
                size_px: int = 1024) -> tuple[str, int, int]:
    """BBOX WMS (CRS:84) + pixels pour GetMap / GetFeatureInfo."""
    rayon_m = math.sqrt(max(surface_m2, 1) / math.pi) * 1.5
    dlat = rayon_m / 111_000
    dlon = rayon_m / (111_000 * math.cos(math.radians(lat)))
    bbox = f"{lon - dlon},{lat - dlat},{lon + dlon},{lat + dlat}"
    return bbox, size_px, size_px


def _parse_ortho_date(props: dict) -> str | None:
    """Extrait YYYY-MM-DD depuis GetFeatureInfo IGN (date_vol ou millésime pva)."""
    import re
    date_vol = props.get("date_vol")
    if isinstance(date_vol, str):
        m = re.match(r"(\d{4}-\d{2}-\d{2})", date_vol)
        if m:
            return m.group(1)
    pva = props.get("pva")
    if isinstance(pva, int) and 1990 < pva < 2100:
        return f"{pva}-01-01"
    if isinstance(pva, str) and re.fullmatch(r"\d{4}", pva.strip()):
        return f"{pva.strip()}-01-01"
    return None


def fetch_ortho_acquisition_date(lat: float, lon: float, surface_m2: float,
                                   size_px: int = 1024) -> str | None:
    """Date de prise de vue orthophoto IGN au point (GetFeatureInfo WMS)."""
    bbox, width, height = _ortho_view(lat, lon, surface_m2, size_px)
    try:
        r = requests.get(WMS_ORTHO_GEOPF, params={
            "SERVICE": "WMS", "VERSION": "1.3.0", "REQUEST": "GetFeatureInfo",
            "LAYERS": ORTHO_LAYER, "QUERY_LAYERS": ORTHO_LAYER,
            "INFO_FORMAT": "application/json", "FORMAT": "image/png", "STYLES": "",
            "CRS": "CRS:84", "BBOX": bbox, "WIDTH": width, "HEIGHT": height,
            "I": width // 2, "J": height // 2,
        }, timeout=30, headers={"User-Agent": "SolarIndex-Pipeline/1.0"})
        if not r.ok:
            return None
        data = r.json()
        features = data.get("features") or []
        if not features:
            return None
        return _parse_ortho_date(features[0].get("properties") or {})
    except (requests.RequestException, ValueError, TypeError, KeyError):
        return None


def fetch_ortho(lat: float, lon: float, surface_m2: float,
                size_px: int = 1024) -> dict | None:
    """Orthophoto PNG (base64) + date IGN si disponible."""
    bbox, width, height = _ortho_view(lat, lon, surface_m2, size_px)
    try:
        r = requests.get(WMS_ORTHO_GEOPF, params={
            "SERVICE": "WMS", "VERSION": "1.3.0", "REQUEST": "GetMap",
            "LAYERS": ORTHO_LAYER, "STYLES": "", "CRS": "CRS:84", "BBOX": bbox,
            "WIDTH": width, "HEIGHT": height, "FORMAT": "image/png",
        }, timeout=30, headers={"User-Agent": "SolarIndex-Pipeline/1.0"})
        if "image/png" not in r.headers.get("Content-Type", "") or len(r.content) < 5_000:
            return None
        ortho_date = fetch_ortho_acquisition_date(lat, lon, surface_m2, size_px)
        return {
            "image_b64": base64.standard_b64encode(r.content).decode("utf-8"),
            "ortho_date": ortho_date,
        }
    except requests.RequestException:
        return None


def fetch_ortho_image_b64(lat: float, lon: float, surface_m2: float,
                          size_px: int = 1024) -> str | None:
    """Orthophoto PNG (Géoplateforme WMS) centrée sur le parking, en base64."""
    pack = fetch_ortho(lat, lon, surface_m2, size_px)
    return pack["image_b64"] if pack else None


def _parse_vision_json(text: str) -> dict:
    text = text.strip().replace("```json", "").replace("```", "").strip()
    try:
        res = json.loads(text)
        if not isinstance(res.get("ombriere_detectee"), bool):
            raise ValueError
        return res
    except (json.JSONDecodeError, ValueError, AttributeError):
        return {"ombriere_detectee": None, "confidence": 0.0,
                "surface_couverte_pct": 0, "notes": "erreur_parsing"}


def _anthropic_text(content: object) -> str:
    """Extrait le premier bloc texte d'une réponse Anthropic (typage union-safe)."""
    if not isinstance(content, list):
        return ""
    for block in content:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            return text
    return ""


def _anthropic_module() -> ModuleType | None:
    """Import paresseux du SDK Anthropic (optionnel — vision ombrières)."""
    try:
        return importlib.import_module("anthropic")
    except ImportError:
        return None


def check_vision_ombriere(image_b64: str) -> dict:
    """Appelle Claude Haiku sur une orthophoto. None si erreur/clé absente."""
    if not ANTHROPIC_KEY:
        return {"ombriere_detectee": None, "confidence": 0.0, "notes": "pas_de_cle"}
    anthropic = _anthropic_module()
    if anthropic is None:
        return {"ombriere_detectee": None, "confidence": 0.0, "notes": "anthropic_absent"}
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        resp = client.messages.create(
            model=VISION_MODEL, max_tokens=200,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64",
                 "media_type": "image/png", "data": image_b64}},
                {"type": "text", "text": VISION_PROMPT},
            ]}],
        )
        return _parse_vision_json(_anthropic_text(resp.content))
    except Exception:
        return {"ombriere_detectee": None, "confidence": 0.0, "notes": "erreur_api"}


def apply_vision_result(record: dict, vision: dict,
                        ortho_date: str | None = None) -> dict:
    """Met à jour le record selon la vision (photo > 45 % → équipé, hors vente)."""
    from datetime import datetime, timezone
    record["vision_checked_at"] = datetime.now(timezone.utc).isoformat()
    if ortho_date:
        record["vision_ortho_date"] = ortho_date
    if vision.get("ombriere_detectee") is None:
        return record
    record["vision_flag"] = bool(vision["ombriere_detectee"])
    record["vision_confidence"] = round(float(vision.get("confidence", 0)), 2)
    vision_pct: float | None = None
    raw_pct = vision.get("surface_couverte_pct")
    if raw_pct is not None:
        try:
            vision_pct = round(min(100.0, max(0.0, float(raw_pct))), 1)
            record["vision_surface_couverte_pct"] = vision_pct
        except (TypeError, ValueError):
            pass
    if vision_pct is not None and vision_pct > VISION_COVERAGE_EQUIPE:
        record["detection"] = "equipe"
    elif vision["ombriere_detectee"] and vision.get("confidence", 0) >= 0.70:
        record["detection"] = "a_verifier"
    elif not vision["ombriere_detectee"] and vision.get("confidence", 0) >= 0.70:
        record["score_confiance"] = min(0.95, (record.get("score_confiance") or 0.5) + 0.10)
    return apply_huwart_adjustment(record)


def run_vision_on(records: list[dict]) -> None:
    """
    Lance la vision sur les leads URGENCE + libres (les plus chers). Utilise le
    Batch API Anthropic au-delà de 100 images (-50 %), sinon des appels unitaires.
    Modifie les records en place. Skip total si pas de clé.
    """
    cibles = [
        r for r in records
        if "URGENCE" in str(r.get("flag_urgence", ""))
        and r.get("detection") == "libre"
        and r.get("vision_checked_at") is None
    ]
    if not cibles:
        return
    if not ANTHROPIC_KEY:
        print(f"    [Vision] {len(cibles)} leads éligibles mais ANTHROPIC_API_KEY absente → skip.")
        return
    print(f"    [Vision] Analyse de {len(cibles)} leads URGENCE libres...")
    if len(cibles) > 100:
        results = run_vision_batch(cibles)
        for r in cibles:
            if r["osm_id"] in results:
                apply_vision_result(
                    r, results[r["osm_id"]], ortho_date=r.get("_ortho_date"),
                )
        return
    for r in cibles:
        pack = fetch_ortho(r["latitude"], r["longitude"], r["surface_m2"])
        if pack is None:
            continue
        apply_vision_result(r, check_vision_ombriere(pack["image_b64"]),
                            ortho_date=pack.get("ortho_date"))
        time.sleep(0.2)


def run_vision_batch(leads: list[dict]) -> dict:
    """Batch API Anthropic (−50 %) pour > 100 images. Returns: osm_id → vision."""
    anthropic = _anthropic_module()
    if anthropic is None:
        return {}
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    reqs = []
    for lead in leads:
        pack = fetch_ortho(lead["latitude"], lead["longitude"], lead["surface_m2"])
        if pack is None:
            continue
        lead["_ortho_date"] = pack.get("ortho_date")
        reqs.append({"custom_id": str(lead["osm_id"]), "params": {
            "model": VISION_MODEL, "max_tokens": 200,
            "messages": [{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64",
                 "media_type": "image/png", "data": pack["image_b64"]}},
                {"type": "text", "text": VISION_PROMPT},
            ]}],
        }})
    if not reqs:
        return {}
    batch = client.messages.batches.create(requests=reqs)
    print(f"    [Vision] Batch {batch.id} ({len(reqs)} images)...")
    while True:
        status = client.messages.batches.retrieve(batch.id)
        if status.processing_status == "ended":
            break
        time.sleep(30)
    out = {}
    for item in client.messages.batches.results(batch.id):
        oid = int(item.custom_id)
        if item.result.type == "succeeded":
            out[oid] = _parse_vision_json(_anthropic_text(item.result.message.content))
        else:
            out[oid] = {"ombriere_detectee": None, "confidence": 0.0}
    return out


# ─── Enrichissement d'un lead (BAN + cadastre + SIREN + bypasses 2/3/5) ─────
def enrich_lead(lat: float, lon: float, surface_osm: float,
                score_confiance: float = 0.5, bbox=None,
                ville_osm: str = "",
                polygon_coords: list[tuple[float, float]] | None = None) -> tuple[dict, list[str]]:
    """
    Enrichit un seul parking : géocodage, parcelle, entreprise, surface cadastrale,
    propriétaire foncier (MAJIC), dirigeants (RNE), dérogations pente/ABF.

    Returns:
        (result, errors) — result avec noms de colonnes pipeline/CSV ;
        errors = journal des échecs partiels (n'interrompt pas le pipeline).
    """
    errors: list[str] = []

    try:
        geo = reverse_geocode(lat, lon, bbox)
        time.sleep(ENRICH_API_PAUSE_S)
    except Exception as exc:
        errors.append(f"BAN:{type(exc).__name__}:{exc}")
        geo = {"adresse_cadastre": "", "code_insee": "", "ville_ban": "",
               "geocode_score": 0.0, "geocode_methode": ""}

    try:
        parc = get_parcelle(lat, lon, bbox, polygon_coords=polygon_coords)
        time.sleep(ENRICH_API_PAUSE_S)
    except Exception as exc:
        errors.append(f"APICARTO:{type(exc).__name__}:{exc}")
        parc = {"id_parcelle": "", "parcelle_methode": "", "surface_cadastrale_m2": None}

    try:
        ent = search_company(lat, lon)
        time.sleep(ENRICH_API_PAUSE_S)
    except Exception as exc:
        errors.append(f"SIREN:{type(exc).__name__}:{exc}")
        ent = {"siren": "", "raison_sociale": "", "code_naf": "",
               "libelle_naf": "", "secteur_cible": "", "naf_prioritaire": False}

    surf_osm = float(surface_osm or 0)
    retenue, source = resolve_surface(surf_osm, parc.get("surface_cadastrale_m2"))
    solar = compute_solar_potential(retenue)
    flag_csv = (
        "🔴 URGENCE ABSOLUE"
        if compute_flag_urgence(retenue) == "URGENCE_ABSOLUE"
        else "🟡 CONFORME REQUIS"
    )

    result: dict = {
        **geo,
        **parc,
        **ent,
        "surface_osm_m2": round(surf_osm, 1) if surf_osm else 0.0,
        "source_surface": source,
        "surface_m2": retenue,
        **solar,
        "flag_urgence": flag_csv,
        "score_confiance": score_confiance,
    }
    if not result.get("ville_ban") and ville_osm:
        result["ville_ban"] = ville_osm

    id_parcelle = (parc.get("id_parcelle") or "").strip()
    if id_parcelle:
        try:
            prop = resolve_proprietaire_foncier(id_parcelle)
            result.update(prop)
        except Exception as exc:
            errors.append(f"MAJIC:{type(exc).__name__}:{exc}")

    try:
        from lib.company_enrichment import enrich_lead_contacts
        from lib.sirene_stability import fetch_siren_stability
        from datetime import datetime, timezone

        contacts = enrich_lead_contacts(
            ent.get("siren"),
            result.get("siren_proprietaire_foncier"),
        )
        result.update(contacts)
        stability = fetch_siren_stability(ent.get("siren"))
        result.update(stability)
        result["siren_anciennete_checked_at"] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        errors.append(f"DIRIGEANTS:{type(exc).__name__}:{exc}")

    try:
        rec = apply_derogations({
            "latitude": lat, "longitude": lon,
            "surface_m2": retenue, "score_confiance": score_confiance,
        })
        for k in ("pente_pct", "derogation_pente", "derogation_abf", "score_confiance"):
            if k in rec:
                result[k] = rec[k]
    except Exception as exc:
        errors.append(f"DEROGATIONS:{type(exc).__name__}:{exc}")

    return result, errors


def supabase_enrich_payload(result: dict) -> dict:
    """Convertit le dict interne pipeline → colonnes Supabase (PATCH leads)."""
    surf = float(result.get("surface_m2") or 0)
    flag_db = compute_flag_urgence(surf)
    skip = {
        "adresse_cadastre", "ville_ban", "geocode_score", "geocode_methode",
        "parcelle_methode", "secteur_cible", "naf_prioritaire",
    }
    allowed = {
        "adresse", "ville", "code_insee", "id_parcelle",
        "surface_osm_m2", "surface_cadastrale_m2", "source_surface", "surface_m2",
        "surface_solaire_m2", "puissance_kwc", "valeur_chantier_eur", "flag_urgence",
        "siren", "raison_sociale", "code_naf", "libelle_naf",
        "dirigeant_nom", "dirigeant_exploitant", "dirigeant_exploitant_qualite",
        "dirigeant_proprietaire", "dirigeant_proprietaire_qualite",
        "telephone", "telephone_exploitant", "telephone_proprietaire",
        "proprietaire_foncier", "siren_proprietaire_foncier",
        "siren_date_creation", "siren_etat_administratif", "siren_anciennete_checked_at",
        "pente_pct", "derogation_pente", "derogation_abf", "score_confiance",
        "type_solution_recherchee",
    }
    payload = {k: v for k, v in result.items() if k not in skip and k in allowed}
    payload["adresse"] = result.get("adresse_cadastre") or ""
    payload["ville"] = result.get("ville_ban") or None
    payload["flag_urgence"] = flag_db
    for k, v in list(payload.items()):
        if v == "" and k != "adresse":
            payload[k] = None
    return payload


# ─── Orchestrateur d'enrichissement (Étapes 2 + 3) ────────────────────────────
def enrich_dataframe(df: pd.DataFrame, max_rows: int = 0) -> pd.DataFrame:
    """
    Enrichit les leads `libre` / `a_verifier`, triés par surface_m2 décroissante.
    max_rows <= 0 → tous les éligibles ; sinon plafond sur les N plus grandes surfaces.
    """
    work: pd.DataFrame = df
    if "detection" in work.columns:
        work = work.loc[work["detection"].isin(["libre", "a_verifier"])].copy()
    work = work.sort_values(by="surface_m2", ascending=False)
    n = len(work) if max_rows <= 0 else min(max_rows, len(work))
    print(f"[ENRICH] 🏛️  Enrichissement cadastre + entreprise sur {n} leads "
          f"(tri surface_m2 ↓, libre/a_verifier)...")
    if "naf_prioritaire" not in df.columns:
        df["naf_prioritaire"] = False
        df["secteur_cible"] = ""

    for i, rang in enumerate(work.index[:n], start=1):
        lat = df.at[rang, "latitude"]
        lon = df.at[rang, "longitude"]
        bbox = (
            df.at[rang, "bbox_min_lat"], df.at[rang, "bbox_min_lon"],
            df.at[rang, "bbox_max_lat"], df.at[rang, "bbox_max_lon"],
        ) if "bbox_min_lat" in df.columns else None
        surf_osm = float(df.at[rang, "surface_osm_m2"] if "surface_osm_m2" in df.columns
                      else df.at[rang, "surface_m2"])
        score = float(df.at[rang, "score_confiance"] if "score_confiance" in df.columns else 0.5)
        ville = str(df.at[rang, "ville_osm"] if "ville_osm" in df.columns else "")

        polygon_coords = None
        if "_parking_coords" in df.columns:
            raw = df.at[rang, "_parking_coords"]
            if isinstance(raw, list) and len(raw) >= 3:
                polygon_coords = raw

        result, errs = enrich_lead(
            lat, lon, surf_osm, score, bbox, ville, polygon_coords=polygon_coords,
        )
        for col, val in result.items():
            if col in df.columns:
                df.at[rang, col] = val
        if errs:
            print(f"    [{i:>3}/{n}] ⚠️  {' · '.join(errs[:2])}")

        societe = result.get("raison_sociale") or "—"
        methode = result.get("geocode_methode", "")
        flag_geo = "  ⚠️ vote bbox" if str(methode).startswith("vote") else ""
        print(f"    [{i:>3}/{n}] {str(societe)[:38]:<38} {result.get('code_naf',''):<8}{flag_geo}")
        time.sleep(ENRICH_PAUSE_S)

    enrichis = (df["raison_sociale"].astype(str).str.len() > 0).sum()
    cibles = df["naf_prioritaire"].sum()
    print(f"    → {enrichis} entreprises identifiées, dont {cibles} sur un secteur cible prioritaire.")
    return df


# ─── Pipeline Principal ───────────────────────────────────────────────────────
def run_pipeline(dept_id: str, output_path: str,
                 enrich: bool = False, max_enrich: int = 0,
                 verify: bool = False, registry: bool = True,
                 vision: bool = False) -> pd.DataFrame:
    """
    Orchestre le pipeline complet :
      1. Requête Overpass → éléments OSM bruts
      2. Calcul de surface → filtrage >= 1500 m²
      3. Calcul centroïde, potentiel solaire, flags
      3bis. (verify) Détection panneaux existants : recouvrement OSM (A) +
            registre national ODRÉ par commune (B)
      4. Export CSV
    """
    print(f"[1/4] 🌍 Envoi requête Overpass pour le département {dept_id}...")
    elements = fetch_overpass(build_overpass_query(dept_id))
    ids_with_surface = {el.get("id") for el in elements}
    print(f"    → {len(elements)} parkings avec tag surface (asphalt/concrete/paved)")

    # Bypass 1 : parkings sans tag surface (capturés par géométrie). Non bloquant.
    try:
        extra = fetch_overpass(build_overpass_query_no_surface(dept_id))
        extra = [el for el in extra if el.get("id") not in ids_with_surface]
        elements += extra
        print(f"    → +{len(extra)} parkings sans tag surface (surface inférée)")
    except Exception as e:  # noqa: BLE001 — ne jamais bloquer le pipeline sur la requête bonus
        print(f"    ⚠️  Requête 'sans surface' échouée ({type(e).__name__}) — on continue sans.")
    print(f"    → {len(elements)} éléments OSM au total (avant filtrage surface)")

    solar_tree, solar_polys = (None, [])
    if verify:
        print("[2/4] 🔎 Détection PV activée (recouvrement OSM"
              + (" + registre ODRÉ" if registry else "") + ")...")
        solar_tree, solar_polys = fetch_solar_index(dept_id)

    print("[2/4] 📐 Calcul des surfaces géodésiques (projection Lambert-93)...")
    records = []
    for el in elements:
        osm_id = el.get("id")
        osm_type = el.get("type")
        tags = el.get("tags", {})

        coords = extract_coords_from_element(el)
        if not coords:
            continue

        surface = geodesic_area_m2(coords)
        if surface < SURFACE_MIN_M2:
            continue

        lat, lon = centroid_from_coords(coords)
        bbox = bbox_from_coords(coords)
        solar = compute_solar_potential(surface)

        # Bypass 1 : surface confirmée par OSM ou seulement inférée ?
        surface_tag_present = osm_id in ids_with_surface
        # Score de confiance de base : plafonné pour les surfaces inférées.
        score_confiance = 0.7 if not surface_tag_present else 0.8

        # Détection panneaux existants — Signal A (recouvrement OSM) calculé ici ;
        # Signal B (registre, via géocodage groupé) finalisé après la boucle.
        pv_overlap = 0.0
        if verify:
            poly_l93 = _polygon_l93(coords)
            if poly_l93 is not None:
                pv_overlap = pv_overlap_ratio(poly_l93, solar_tree, solar_polys)

        records.append({
            # Identifiants OSM
            "osm_id": osm_id,
            "osm_type": osm_type,
            # Géographie
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            # Bounding box (pour le fallback de géocodage des grands parkings)
            "bbox_min_lat": round(bbox[0], 6),
            "bbox_min_lon": round(bbox[1], 6),
            "bbox_max_lat": round(bbox[2], 6),
            "bbox_max_lon": round(bbox[3], 6),
            "surface_m2": round(surface, 1),
            # Bypass 1 & 2 : traçabilité des surfaces
            "surface_osm_m2": round(surface, 1),
            "surface_cadastrale_m2": None,
            "source_surface": "osm",
            "surface_tag_present": surface_tag_present,
            "score_confiance": score_confiance,
            "type_solution_recherchee": "pv_pur",
            # Flags réglementaires
            "flag_urgence": (
                "🔴 URGENCE ABSOLUE"
                if compute_flag_urgence(surface) == "URGENCE_ABSOLUE"
                else "🟡 CONFORME REQUIS"
            ),
            # Tags OSM utiles
            "nom_osm": tags.get("name", ""),
            "operateur_osm": tags.get("operator", ""),
            "adresse_osm": tags.get("addr:street", ""),
            "ville_osm": tags.get("addr:city", ""),
            # Potentiel solaire (Étape 4 du pipeline)
            **solar,
            # Détection panneaux existants (Étape 3bis — Signal A + B)
            "pv_osm": pv_overlap >= PV_OVERLAP_MIN,
            "pv_overlap_pct": round(pv_overlap, 3),
            "pv_registry_count": -1,
            "detection": "",
            # Colonnes à enrichir (Étapes 2 & 3 — cadastre IGN + Recherche entreprises)
            "adresse_cadastre": "",
            "code_insee": "",
            "geocode_score": 0.0,
            "geocode_methode": "",
            "id_parcelle": "",
            "parcelle_methode": "",
            "siren": "",
            "raison_sociale": "",
            "code_naf": "",
            "libelle_naf": "",
            "secteur_cible": "",
            "naf_prioritaire": False,
            # Bypass 3 : propriétaire foncier (MAJIC DGFiP, jointure parcelle)
            "proprietaire_foncier": None,
            "siren_proprietaire_foncier": None,
            # Bypass 5 : dérogations APER
            "pente_pct": None,
            "derogation_pente": False,
            "derogation_abf": False,
            # Bypass 4 : validation vision ombrières
            "vision_flag": False,
            "vision_confidence": None,
            "vision_checked_at": None,
            "vision_surface_couverte_pct": None,
            # Géométrie OSM (enrichissement multi-parcelle — non exportée CSV)
            "_parking_coords": coords,
        })

    print(f"    → {len(records)} parkings retenus (surface ≥ {SURFACE_MIN_M2} m²)")

    # ── Finalisation de la détection (Signal B : registre ODRÉ par commune) ──
    if verify and records:
        insees = [""] * len(records)
        if registry:
            print("    🛰️  Géocodage inversé groupé (BAN) pour le code commune...")
            insees = reverse_geocode_bulk([(r["latitude"], r["longitude"]) for r in records])
            print("    🏛️  Croisement avec le registre national ODRÉ...")
        for rec, insee in zip(records, insees):
            overlap = rec["pv_overlap_pct"]
            reg_match = -1
            if registry and overlap < PV_OVERLAP_EQUIPE:
                reg_match = registry_match_count(
                    rec["puissance_kwc"], registry_solar_powers(insee)
                )
            rec["pv_registry_count"] = reg_match
            rec["detection"] = classify_detection(overlap, reg_match)
            apply_huwart_adjustment(rec)

    print("[3/4] 📊 Construction du DataFrame & tri par valeur commerciale...")
    df = pd.DataFrame(records)
    if df.empty:
        print("    ⚠️  Aucun résultat. Vérifiez le code département.")
        return df

    df = df.sort_values("valeur_chantier_eur", ascending=False).reset_index(drop=True)
    df.index += 1  # Index démarrant à 1 pour lisibilité

    # Statistiques rapides
    total_kwc = df["puissance_kwc"].sum()
    total_valeur = df["valeur_chantier_eur"].sum()
    urgences = (df["flag_urgence"].str.contains("URGENCE")).sum()
    print(f"""
    ┌─────────────────────────────────────────────┐
    │  📈 RÉSUMÉ DU SCAN — Département {dept_id}         │
    ├─────────────────────────────────────────────┤
    │  Parkings identifiés  : {len(df):>6}               │
    │  dont URGENCE ABSOLUE : {urgences:>6}               │
    │  Puissance totale     : {total_kwc:>6,.0f} kWc          │
    │  Valeur pipeline      : {total_valeur/1e6:>6.1f} M€           │
    └─────────────────────────────────────────────┘""")

    if verify and "detection" in df.columns:
        equipe = (df["detection"] == "equipe").sum()
        a_verif = (df["detection"] == "a_verifier").sum()
        libre = (df["detection"] == "libre").sum()
        print(f"    🔆 Détection PV : {libre} libres · {a_verif} à vérifier · "
              f"{equipe} déjà équipés (exclus de la vente)")

    if enrich:
        df = enrich_dataframe(df, max_enrich)

    # ── Bypass 4 : vision ombrières sur les leads URGENCE encore 'libre' ──────
    if vision and verify:
        cibles = df.index[
            df["flag_urgence"].str.contains("URGENCE")
            & (df["detection"] == "libre")
            & (df["vision_checked_at"].isna())
        ]
        if len(cibles) == 0:
            print("    [Vision] Aucun lead URGENCE libre à analyser.")
        elif not ANTHROPIC_KEY:
            print(f"    [Vision] {len(cibles)} leads éligibles mais ANTHROPIC_API_KEY absente → skip.")
        else:
            print(f"    [Vision] Analyse orthophoto de {len(cibles)} leads URGENCE libres...")
            for rang in cibles:
                pack = fetch_ortho(
                    df.at[rang, "latitude"], df.at[rang, "longitude"],
                    df.at[rang, "surface_m2"],
                )
                rec = {"detection": df.at[rang, "detection"],
                       "score_confiance": df.at[rang, "score_confiance"]}
                vis = (check_vision_ombriere(pack["image_b64"]) if pack
                       else {"ombriere_detectee": None})
                apply_vision_result(rec, vis,
                                    ortho_date=pack.get("ortho_date") if pack else None)
                for k in ("detection", "score_confiance", "vision_flag",
                          "vision_confidence", "vision_checked_at",
                          "vision_surface_couverte_pct", "vision_ortho_date"):
                    if k in rec:
                        df.at[rang, k] = rec[k]
                time.sleep(0.2)

    print(f"[EXPORT] 💾 Export CSV → {output_path}")
    export_df = df.drop(columns=["_parking_coords"], errors="ignore")
    export_df.to_csv(output_path, index=True, index_label="rang", encoding="utf-8-sig")
    suffixe = "" if enrich else " (lancez avec --enrich pour l'enrichissement B2B)"
    print(f"    ✅ Export terminé{suffixe}.")

    return df


# ─── Démonstration sans appel réseau (mode dry-run) ───────────────────────────
def demo_mode():
    """
    Mode démonstration : simule 3 polygones OSM réalistes en Gironde
    pour illustrer le pipeline sans requête réseau.
    """
    print("\n" + "="*55)
    print("  🔆 SOLARINDEX — MODE DÉMONSTRATION (données simulées)")
    print("="*55)

    # Coordonnées réalistes : hypermarché Mérignac, Bordeaux Lac, zone logistique
    mock_elements = [
        {
            "type": "way", "id": 123456789,
            "tags": {"name": "Hypermarché Géant Mérignac", "operator": "Casino",
                     "amenity": "parking", "surface": "asphalt"},
            "geometry": [  # ~22 000 m²
                {"lon": -0.6850, "lat": 44.8420},
                {"lon": -0.6820, "lat": 44.8420},
                {"lon": -0.6820, "lat": 44.8400},
                {"lon": -0.6850, "lat": 44.8400},
                {"lon": -0.6850, "lat": 44.8420},
            ]
        },
        {
            "type": "way", "id": 987654321,
            "tags": {"name": "Centre Commercial Bordeaux Lac", "operator": "Unibail",
                     "amenity": "parking", "surface": "asphalt"},
            "geometry": [  # ~35 000 m²
                {"lon": -0.5700, "lat": 44.8850},
                {"lon": -0.5650, "lat": 44.8850},
                {"lon": -0.5650, "lat": 44.8810},
                {"lon": -0.5700, "lat": 44.8810},
                {"lon": -0.5700, "lat": 44.8850},
            ]
        },
        {
            "type": "way", "id": 111222333,
            "tags": {"name": "Entrepôt Logistique XPO", "operator": "XPO Logistics",
                     "amenity": "parking", "surface": "concrete"},
            "geometry": [  # ~2 800 m²
                {"lon": -0.5100, "lat": 44.8200},
                {"lon": -0.5090, "lat": 44.8200},
                {"lon": -0.5090, "lat": 44.8190},
                {"lon": -0.5100, "lat": 44.8190},
                {"lon": -0.5100, "lat": 44.8200},
            ]
        },
    ]

    records = []
    for el in mock_elements:
        coords = [(n["lon"], n["lat"]) for n in el["geometry"]]
        surface = geodesic_area_m2(coords)
        lat, lon = centroid_from_coords(coords)
        solar = compute_solar_potential(surface)
        tags = el["tags"]

        records.append({
            "osm_id": el["id"],
            "nom_osm": tags.get("name", ""),
            "operateur_osm": tags.get("operator", ""),
            "surface_m2": round(surface, 1),
            "flag_urgence": (
                "🔴 URGENCE ABSOLUE"
                if compute_flag_urgence(surface) == "URGENCE_ABSOLUE"
                else "🟡 CONFORME REQUIS"
            ),
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            **solar,
        })

    df = pd.DataFrame(records).sort_values("valeur_chantier_eur", ascending=False)
    df.index = range(1, len(df) + 1)

    print("\n📋 RÉSULTATS :")
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 120)
    print(df[["nom_osm", "surface_m2", "flag_urgence", "puissance_kwc", "valeur_chantier_eur"]].to_string())
    print(f"\n💰 Valeur pipeline totale : {df['valeur_chantier_eur'].sum()/1e6:.2f} M€")
    print(f"⚡ Puissance totale       : {df['puissance_kwc'].sum():,.0f} kWc\n")
    return df


# ─── Point d'Entrée ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="SolarIndex — Pipeline de génération de leads loi APER"
    )
    parser.add_argument("--dept", type=str, default="33",
                        help="Code INSEE du département (ex: 33 pour Gironde)")
    parser.add_argument("--output", type=str, default="leads_solaires.csv",
                        help="Chemin du fichier CSV de sortie")
    parser.add_argument("--demo", action="store_true",
                        help="Mode démonstration (sans appel réseau)")
    parser.add_argument("--enrich", action="store_true",
                        help="Active l'enrichissement cadastre + entreprise (Étapes 2 & 3)")
    parser.add_argument("--max-enrich", type=int, default=0,
                        help="Nb max de leads à enrichir (0 = tous libre/a_verifier, tri surface_m2 ↓)")
    parser.add_argument("--verify", action="store_true",
                        help="Détecte les panneaux existants : recouvrement OSM (A) + registre ODRÉ (B)")
    parser.add_argument("--no-registry", action="store_true",
                        help="Avec --verify : désactive le signal B (registre ODRÉ), garde OSM seul")
    parser.add_argument("--vision", action="store_true",
                        help="Bypass 4 : validation vision ombrières (Claude Haiku) sur les leads "
                             "URGENCE libres. Nécessite ANTHROPIC_API_KEY et --verify")
    args = parser.parse_args()

    if args.demo:
        demo_mode()
    else:
        df = run_pipeline(dept_id=args.dept, output_path=args.output,
                          enrich=args.enrich, max_enrich=args.max_enrich,
                          verify=args.verify, registry=not args.no_registry,
                          vision=args.vision)
        if not df.empty:
            print(f"\n🏆 Top 5 leads par valeur commerciale :")
            cols = ["nom_osm", "ville_osm", "surface_m2", "flag_urgence",
                    "puissance_kwc", "valeur_chantier_eur"]
            if args.enrich:
                cols += ["raison_sociale", "code_naf", "secteur_cible"]
            print(df[cols].head(5).to_string())
