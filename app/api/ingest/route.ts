import { checkStaticToken } from "@/lib/auth";
import { getExistingByOsmIds, upsertLeads } from "@/lib/db";
import { mapPipelineToLead } from "@/lib/leads";
import { PipelineLead } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST /api/ingest
// Appelé par le pipeline Python. Auth : Authorization: Bearer {PIPELINE_INGEST_TOKEN}
// Body : un tableau de leads (format pipeline) ou { leads: [...] }.
export async function POST(req: Request) {
  if (!checkStaticToken(req, process.env.PIPELINE_INGEST_TOKEN)) {
    return Response.json({ error: "Token d'ingestion invalide." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const rawLeads: PipelineLead[] = Array.isArray(body)
    ? (body as PipelineLead[])
    : Array.isArray((body as { leads?: unknown })?.leads)
      ? ((body as { leads: PipelineLead[] }).leads)
      : [];

  if (rawLeads.length === 0) {
    return Response.json(
      { error: "Aucun lead fourni (attendu : tableau ou { leads: [...] })." },
      { status: 400 },
    );
  }

  // Mapping pipeline → schéma DB, en ignorant les entrées sans osm_id valide.
  const mapped = rawLeads
    .filter((l) => l && l.osm_id != null && !Number.isNaN(Number(l.osm_id)))
    .map(mapPipelineToLead);

  if (mapped.length === 0) {
    return Response.json({ error: "Aucun lead avec osm_id valide." }, { status: 400 });
  }

  // On ne réécrit jamais un lead déjà complet (3 acheteurs).
  const osmIds = mapped.map((m) => m.osm_id);
  const existing = await getExistingByOsmIds(osmIds);
  const statutByOsmId = new Map(existing.map((e) => [Number(e.osm_id), e.statut]));

  const toUpsert: typeof mapped = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const lead of mapped) {
    const existingStatut = statutByOsmId.get(lead.osm_id);
    if (existingStatut === undefined) {
      inserted++;
      toUpsert.push(lead);
    } else if (existingStatut === "complet" || existingStatut === "vendu") {
      skipped++;
    } else {
      updated++;
      toUpsert.push(lead);
    }
  }

  try {
    await upsertLeads(toUpsert as unknown as Record<string, unknown>[]);
  } catch (e) {
    return Response.json(
      { error: "Échec de l'upsert Supabase.", details: String(e) },
      { status: 500 },
    );
  }

  return Response.json({ inserted, updated, skipped });
}
