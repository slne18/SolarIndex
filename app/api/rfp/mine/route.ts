import { getBearerToken } from "@/lib/auth";
import { getAnonClient } from "@/lib/supabase";
import { queryRfpSubmissionsByDeposant } from "@/lib/rfp-withdrawal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

const STATUT_LABELS: Record<string, string> = {
  en_attente_verification: "Email à confirmer",
  en_attente_moderation: "En modération",
  publie: "Publié",
  rejete: "Refusé",
  ferme: "Retiré",
};

// GET /api/rfp/mine — dépôts de l'utilisateur connecté
export async function GET(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return Response.json({ error: "Connexion requise." }, { status: 401, headers: NO_STORE });
  }

  const { data: userData, error: userErr } = await getAnonClient().auth.getUser(token);
  if (userErr || !userData?.user) {
    return Response.json({ error: "Session invalide." }, { status: 401, headers: NO_STORE });
  }

  try {
    const rows = await queryRfpSubmissionsByDeposant(userData.user.id, userData.user.email ?? "");
    return Response.json(
      {
        submissions: rows.map((row) => ({
          id: row.id,
          created_at: row.created_at,
          statut: row.statut,
          statut_label: STATUT_LABELS[row.statut] ?? row.statut,
          entreprise: row.entreprise,
          adresse: row.adresse,
          departement: row.departement,
          surface_estimee_m2: row.surface_estimee_m2,
          ao_publie_officiellement: row.ao_publie_officiellement ?? false,
          date_limite_offres: row.date_limite_offres ?? null,
          acheteurs_count: row.acheteurs_count,
          can_withdraw: ["en_attente_verification", "en_attente_moderation", "publie"].includes(
            row.statut,
          ),
        })),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { error: "Impossible de charger vos dépôts.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}
