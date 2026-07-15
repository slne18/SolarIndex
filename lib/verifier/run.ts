import {
  applicableAperDeadline,
  aperEligibilityLabel,
  aperEligibilityStatus,
  formatAperAnnualFine,
} from "@/lib/aper-deadlines";
import { detectParkingNearPoint } from "./overpass";
import { fetchParcelSurface } from "./apicarto";
import { fetchPentePct, fetchZoneAbf, PENTE_DEROGATION_PCT } from "./derogations";

export type VerifierInput = {
  lat: number;
  lon: number;
  label?: string;
  manualSurfaceM2?: number;
};

export type VerifierResult = {
  ok: true;
  label: string;
  lat: number;
  lon: number;
  surfaceM2: number | null;
  surfaceSource:
    | "manual"
    | "osm_parking"
    | "cadastre_parcelle"
    | null;
  surfaceNote?: string;
  needsManualSurface: boolean;
  eligibility: ReturnType<typeof aperEligibilityStatus>;
  eligibilityLabel: string;
  deadline: ReturnType<typeof applicableAperDeadline> | null;
  fineLabel: string | null;
  derogations: {
    pentePct: number | null;
    derogationPente: boolean;
    zoneAbf: boolean;
    summary: "none" | "pente" | "abf" | "both";
  };
};

export async function runVerifier(input: VerifierInput): Promise<VerifierResult> {
  const { lat, lon, label = "Adresse sélectionnée" } = input;
  let surfaceM2: number | null = null;
  let surfaceSource: VerifierResult["surfaceSource"] = null;
  let surfaceNote: string | undefined;
  let needsManualSurface = false;

  if (input.manualSurfaceM2 != null && input.manualSurfaceM2 > 0) {
    surfaceM2 = Math.round(input.manualSurfaceM2 * 10) / 10;
    surfaceSource = "manual";
  } else {
    try {
      const parking = await detectParkingNearPoint(lat, lon);
      if (parking) {
        surfaceM2 = parking.surfaceM2;
        surfaceSource = "osm_parking";
      }
    } catch {
      // Overpass indisponible → fallback cadastre
    }

    if (surfaceM2 == null) {
      const parcel = await fetchParcelSurface(lat, lon);
      if (parcel) {
        surfaceM2 = parcel.surfaceM2;
        surfaceSource = "cadastre_parcelle";
        surfaceNote =
          "Surface parcelle indicative — peut différer du parking réel.";
      }
    }

    if (surfaceM2 == null) {
      needsManualSurface = true;
    }
  }

  const eligibility = aperEligibilityStatus(surfaceM2);
  const deadline =
    surfaceM2 != null && eligibility === "concerned"
      ? applicableAperDeadline(surfaceM2)
      : null;
  const fineLabel =
    surfaceM2 != null && eligibility === "concerned"
      ? formatAperAnnualFine(surfaceM2)
      : null;

  let pentePct: number | null = null;
  let zoneAbf = false;
  if (surfaceM2 != null && surfaceM2 > 0) {
    [pentePct, zoneAbf] = await Promise.all([
      fetchPentePct(lat, lon, surfaceM2),
      fetchZoneAbf(lat, lon),
    ]);
  }

  const derogationPente = pentePct != null && pentePct > PENTE_DEROGATION_PCT;
  const summary: VerifierResult["derogations"]["summary"] =
    derogationPente && zoneAbf
      ? "both"
      : derogationPente
        ? "pente"
        : zoneAbf
          ? "abf"
          : "none";

  return {
    ok: true,
    label,
    lat,
    lon,
    surfaceM2,
    surfaceSource,
    surfaceNote,
    needsManualSurface,
    eligibility,
    eligibilityLabel: aperEligibilityLabel(eligibility),
    deadline,
    fineLabel,
    derogations: {
      pentePct,
      derogationPente,
      zoneAbf,
      summary,
    },
  };
}
