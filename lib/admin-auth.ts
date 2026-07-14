import { checkStaticToken } from "./auth";

export function getAdminTokenExpected(): string | undefined {
  return process.env.ADMIN_SECRET_TOKEN;
}

export function isAdminAuthorized(req: Request): boolean {
  return checkStaticToken(req, getAdminTokenExpected());
}

/** Retourne une Response 401 si non autorisé, sinon null. */
export function requireAdmin(req: Request): Response | null {
  if (!getAdminTokenExpected()) {
    return Response.json(
      { error: "ADMIN_SECRET_TOKEN non configuré sur le serveur." },
      { status: 503 },
    );
  }
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: "Token admin invalide." }, { status: 401 });
  }
  return null;
}
