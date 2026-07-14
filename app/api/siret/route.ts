import { verifySiret } from "@/lib/sirene";

export const dynamic = "force-dynamic";

// GET /api/siret?siret=…
export async function GET(req: Request) {
  const siret = new URL(req.url).searchParams.get("siret") ?? "";
  const result = await verifySiret(siret);
  return Response.json(result);
}
