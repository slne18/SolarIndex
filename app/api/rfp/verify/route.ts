import { verifyRfpEmail } from "@/lib/rfp-db";

export const dynamic = "force-dynamic";

// GET /api/rfp/verify?token=…
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return Response.redirect(new URL("/appels-offres/nouveau?error=token", req.url));
  }

  try {
    const row = await verifyRfpEmail(token);
    if (!row) {
      return Response.redirect(new URL("/appels-offres/nouveau?error=invalid", req.url));
    }
    return Response.redirect(new URL("/appels-offres/nouveau?verified=1", req.url));
  } catch {
    return Response.redirect(new URL("/appels-offres/nouveau?error=server", req.url));
  }
}
