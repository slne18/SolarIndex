const API_CADASTRE_PARCELLE = "https://apicarto.ign.fr/api/cadastre/parcelle";

type ParcelHit = { idu: string; contenance: number | null };

async function parcelleOne(lat: number, lon: number): Promise<ParcelHit | null> {
  const geom = JSON.stringify({ type: "Point", coordinates: [lon, lat] });
  const url = `${API_CADASTRE_PARCELLE}?${new URLSearchParams({ geom })}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ properties?: Record<string, unknown> }>;
  };
  const props = data.features?.[0]?.properties;
  if (!props) return null;
  const idu =
    (props.idu as string) ||
    `${props.code_dep ?? ""}${props.code_com ?? ""}${props.section ?? ""}${props.numero ?? ""}`;
  if (!idu) return null;
  const contenance =
    props.contenance != null && props.contenance !== ""
      ? Number(props.contenance)
      : null;
  return {
    idu,
    contenance: Number.isFinite(contenance) ? contenance : null,
  };
}

export type ParcelSurface = {
  surfaceM2: number;
  source: "cadastre_parcelle";
  parcelleId: string;
  indicative: true;
};

export async function fetchParcelSurface(lat: number, lon: number): Promise<ParcelSurface | null> {
  const hit = await parcelleOne(lat, lon);
  if (!hit?.contenance || hit.contenance <= 0) return null;
  return {
    surfaceM2: Math.round(hit.contenance * 10) / 10,
    source: "cadastre_parcelle",
    parcelleId: hit.idu,
    indicative: true,
  };
}
