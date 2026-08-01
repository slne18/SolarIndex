import { getUserIdFromRequest } from "@/lib/auth";
import { getUserProfile, isProfileComplete } from "@/lib/profile";
import {
  PROJET_DELAI_LABELS,
  USER_TYPE_LABELS,
  type ProfileOnboardingInput,
  validateProfileOnboarding,
} from "@/lib/profile-onboarding";
import { PROFIL_ACHETEUR_LABELS } from "@/lib/profil-acheteur";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

function profileResponse(profile: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>) {
  return {
    profile_completed: isProfileComplete(profile),
    profile: {
      email: profile.email,
      user_type: profile.user_type,
      user_type_label: profile.user_type ? USER_TYPE_LABELS[profile.user_type] : null,
      profil_acheteur: profile.profil_acheteur,
      profil_acheteur_label: profile.profil_acheteur
        ? PROFIL_ACHETEUR_LABELS[profile.profil_acheteur]
        : null,
      entreprise: profile.entreprise,
      siren: profile.siren,
      siret: profile.siret,
      pays_entreprise: profile.pays_entreprise,
      immatriculation_etrangere: profile.immatriculation_etrangere,
      entreprise_etrangere: !!profile.immatriculation_etrangere,
      proprietaire_raison_sociale: profile.proprietaire_raison_sociale,
      proprietaire_nom: profile.proprietaire_nom,
      responsable_prenom: profile.responsable_prenom,
      responsable_nom: profile.responsable_nom,
      telephone_mobile: profile.telephone,
      telephone_bureau: profile.telephone_bureau,
      adresse_parking: profile.adresse_parking,
      surface_m2_estimee: profile.surface_m2_estimee,
      projet_delai: profile.projet_delai,
      projet_delai_label: profile.projet_delai ? PROJET_DELAI_LABELS[profile.projet_delai] : null,
      commentaire: profile.commentaire,
      profile_completed_at: profile.profile_completed_at,
    },
  };
}

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });
  }

  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return Response.json({ error: "Profil introuvable." }, { status: 404, headers: NO_STORE });
    }
    return Response.json(profileResponse(profile), { headers: NO_STORE });
  } catch (e) {
    return Response.json(
      { error: "Impossible de charger le profil.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: "Non connecté." }, { status: 401, headers: NO_STORE });
  }

  let body: ProfileOnboardingInput;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }

  const validated = validateProfileOnboarding(body);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400, headers: NO_STORE });
  }

  const data = validated.data;
  const now = new Date().toISOString();

  try {
    const { error } = await getAdminClient()
      .from("profiles")
      .update({
        user_type: data.user_type,
        profil_acheteur: data.profil_acheteur,
        entreprise: data.entreprise,
        siren: data.siren,
        siret: data.siret,
        pays_entreprise: data.pays_entreprise,
        immatriculation_etrangere: data.immatriculation_etrangere,
        proprietaire_raison_sociale: data.proprietaire_raison_sociale,
        proprietaire_nom: data.proprietaire_nom,
        responsable_prenom: data.responsable_prenom,
        responsable_nom: data.responsable_nom,
        telephone: data.telephone_mobile,
        telephone_bureau: data.telephone_bureau,
        adresse_parking: data.adresse_parking,
        surface_m2_estimee: data.surface_m2_estimee,
        projet_delai: data.projet_delai,
        commentaire: data.commentaire,
        profile_completed_at: now,
      })
      .eq("id", userId);

    if (error) throw error;

    const profile = await getUserProfile(userId);
    if (!profile) {
      return Response.json({ error: "Profil introuvable." }, { status: 404, headers: NO_STORE });
    }

    return Response.json(
      {
        ...profileResponse(profile),
        persona: data.user_type === "installateur" ? "installer" : "owner",
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { error: "Échec enregistrement profil.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}
