import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ features: [] }, { headers: NO_STORE });
  }

  const params = new URLSearchParams({
    q,
    limit: "6",
    autocomplete: "1",
  });
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    return NextResponse.json({ features: [] }, { status: 502, headers: NO_STORE });
  }
  const data = await res.json();
  return NextResponse.json(data, { headers: NO_STORE });
}
