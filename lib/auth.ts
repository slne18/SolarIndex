import { getAnonClient } from "./supabase";

// Extrait le token Bearer d'une requête (Authorization: Bearer <token>).
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

// Identifie l'utilisateur connecté à partir de son JWT Supabase.
// Retourne l'id utilisateur, ou null si non authentifié / token invalide.
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const { data, error } = await getAnonClient().auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

// Vérifie un token statique (ingestion pipeline, routes admin).
export function checkStaticToken(req: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  return getBearerToken(req) === expected;
}
