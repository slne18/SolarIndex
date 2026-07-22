import { randomBytes } from "crypto";
import { getUserIdFromRequest } from "@/lib/auth";
import { getUserProfile } from "@/lib/profile";
import { canDepositProject } from "@/lib/profile-onboarding";
import { queryRfpSubmissions, RFP_PAGE_SIZE, createRfpSubmission } from "@/lib/rfp-db";
import { inferGeoFromAddress, toPublicRfp, type RfpStatut } from "@/lib/rfp";
import { parseTypeSolutionRecherchee } from "@/lib/solution-type";
import {
  type RfpDeposantChecklistId,
  validateRfpDeposantDeclarations,
} from "@/lib/rfp-legal";
import { validateRfpOfficialFields } from "@/lib/rfp-official-fields";
import { verifySiret } from "@/lib/sirene";
import { sendRfpVerificationEmail } from "@/lib/email-rfp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

interface SubmitBody {
  entreprise?: string;
  siret?: string;
  contact_nom?: string;
  contact_fonction?: string;
  contact_email?: string;
  contact_telephone?: string;
  adresse?: string;
  latitude?: number;
  longitude?: number;
  surface_estimee_m2?: number;
  deja_equipe_partiel?: boolean;
  derogation_pente?: boolean;
  derogation_abf?: boolean;
  budget_indicatif?: string;
  delai_souhaite?: string;
  notes_particulieres?: string;
  est_personne_publique?: boolean;
  acceptation_non_marche_public?: boolean;
  acceptation_mise_en_relation?: boolean;
  acceptation_multi_installateurs?: boolean;
  acceptation_exactitude?: boolean;
  acceptation_sans_garantie?: boolean;
  acceptation_cgu_deposant?: boolean;
  consentement_rgpd?: boolean;
  type_solution_recherchee?: string;
  checklist?: Partial<Record<RfpDeposantChecklistId, boolean>>;
  ao_publie_officiellement?: boolean;
  lien_consultation_officielle?: string;
  date_limite_offres?: string;
  nombre_places?: number | string;
  type_proprietaire?: string;
  parking_deja_etudie?: boolean;
  documents_complementaires?: string;
  acceptation_reference_officielle?: boolean;
}

function parseOptionalBool(value: string | null): boolean | undefined {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

// GET /api/rfp — catalogue appels d'offres publiés (masqué)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const departement = searchParams.get("departement") || undefined;
  const region = searchParams.get("region") || undefined;
  const surfaceMinRaw = searchParams.get("surface_min");
  const surfaceMin = surfaceMinRaw ? Number(surfaceMinRaw) : undefined;
  const placesMinRaw = searchParams.get("places_min");
  const placesMin = placesMinRaw ? Number(placesMinRaw) : undefined;
  const puissanceMinRaw = searchParams.get("puissance_min");
  const puissanceMin = puissanceMinRaw ? Number(puissanceMinRaw) : undefined;
  const aoPublie = parseOptionalBool(searchParams.get("ao_publie"));
  const parkingEtudie = parseOptionalBool(searchParams.get("parking_etudie"));
  const aperEligible = parseOptionalBool(searchParams.get("aper_eligible"));
  const solutionPaysagiste = parseOptionalBool(searchParams.get("solution_paysagiste"));
  const typeProprietaire = searchParams.get("type_proprietaire") || undefined;
  const deadlineBefore = searchParams.get("deadline_before") || undefined;
  const deadlineAfter = searchParams.get("deadline_after") || undefined;
  const pageRaw = Number(searchParams.get("page") || "0");
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? Math.floor(pageRaw) : 0;

  try {
    const { rows, count } = await queryRfpSubmissions({
      departement,
      region,
      surfaceMin,
      placesMin,
      aoPublie,
      parkingEtudie,
      solutionPaysagiste,
      typeProprietaire,
      deadlineBefore,
      deadlineAfter,
      page,
    });
    let rfps = rows.map(toPublicRfp);
    if (typeof puissanceMin === "number" && !Number.isNaN(puissanceMin)) {
      rfps = rfps.filter((r) => (r.solar?.puissance_kwc ?? 0) >= puissanceMin);
    }
    if (aperEligible === true) {
      rfps = rfps.filter((r) => r.solar?.aper_eligible);
    } else if (aperEligible === false) {
      rfps = rfps.filter((r) => !r.solar?.aper_eligible);
    }
    return Response.json(
      {
        rfps,
        page,
        pageSize: RFP_PAGE_SIZE,
        total: count,
        totalPages: Math.ceil(count / RFP_PAGE_SIZE),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    console.warn("[GET /api/rfp]", e);
    return Response.json(
      {
        rfps: [],
        page,
        pageSize: RFP_PAGE_SIZE,
        total: 0,
        totalPages: 0,
        warning: "Catalogue appels d'offres indisponible (migration Supabase 0016 ?).",
      },
      { headers: NO_STORE },
    );
  }
}

// POST /api/rfp — soumission (compte requis)
export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return Response.json({ error: "Compte requis pour soumettre un appel d'offres." }, { status: 401, headers: NO_STORE });
  }

  const profile = await getUserProfile(userId);
  if (!profile || !canDepositProject(profile.user_type)) {
    return Response.json(
      {
        error:
          "Le dépôt de projet est réservé aux propriétaires et gérants de parking. En tant qu'installateur, consultez le catalogue d'appels d'offres.",
      },
      { status: 403, headers: NO_STORE },
    );
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400, headers: NO_STORE });
  }

  const contactEmail = (body.contact_email ?? "").trim().toLowerCase();
  if (!body.contact_nom?.trim() || !contactEmail || !body.contact_telephone?.trim()) {
    return Response.json({ error: "Contact incomplet." }, { status: 400, headers: NO_STORE });
  }
  if (!body.adresse?.trim()) {
    return Response.json({ error: "Adresse requise." }, { status: 400, headers: NO_STORE });
  }
  const typeSolution = parseTypeSolutionRecherchee(body.type_solution_recherchee);
  if (!typeSolution) {
    return Response.json({ error: "Type de solution recherchée invalide." }, { status: 400, headers: NO_STORE });
  }
  const legalCheck = validateRfpDeposantDeclarations({
    est_personne_publique: !!body.est_personne_publique,
    acceptation_non_marche_public: !!body.acceptation_non_marche_public,
    acceptation_mise_en_relation: !!body.acceptation_mise_en_relation,
    acceptation_multi_installateurs: !!body.acceptation_multi_installateurs,
    acceptation_exactitude: !!body.acceptation_exactitude,
    acceptation_sans_garantie: !!body.acceptation_sans_garantie,
    acceptation_cgu_deposant: !!body.acceptation_cgu_deposant,
    consentement_rgpd: !!body.consentement_rgpd,
    checklist: body.checklist,
  });
  if (!legalCheck.ok) {
    return Response.json({ error: legalCheck.error }, { status: 400, headers: NO_STORE });
  }

  const officialCheck = validateRfpOfficialFields({
    ao_publie_officiellement: !!body.ao_publie_officiellement,
    lien_consultation_officielle: body.lien_consultation_officielle,
    date_limite_offres: body.date_limite_offres,
    nombre_places: body.nombre_places,
    type_proprietaire: body.type_proprietaire,
    parking_deja_etudie: !!body.parking_deja_etudie,
    documents_complementaires: body.documents_complementaires,
  });
  if (!officialCheck.ok) {
    return Response.json({ error: officialCheck.error }, { status: 400, headers: NO_STORE });
  }
  if (officialCheck.data.ao_publie_officiellement && !body.acceptation_reference_officielle) {
    return Response.json(
      {
        error:
          "Acceptez la déclaration sur le lien officiel (autorisation de référencement et consultation du DCE sur la plateforme indiquée).",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const official = officialCheck.data;

  const siretCheck = body.siret?.trim()
    ? await verifySiret(body.siret)
    : { ok: false as const, siret: "", siren: "", entreprise: "", error: "SIRET requis." };

  if (!siretCheck.ok) {
    return Response.json(
      { error: siretCheck.error || "SIRET non vérifié." },
      { status: 400, headers: NO_STORE },
    );
  }

  const geo = inferGeoFromAddress(body.adresse);
  const token = randomBytes(32).toString("hex");
  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/rfp/verify?token=${token}`;

  try {
    const row = await createRfpSubmission({
      statut: "en_attente_verification" as RfpStatut,
      entreprise: siretCheck.entreprise || body.entreprise?.trim() || "",
      siret: siretCheck.siret,
      siret_verifie: true,
      contact_nom: body.contact_nom.trim(),
      contact_fonction: body.contact_fonction?.trim() || null,
      contact_email: contactEmail,
      contact_telephone: body.contact_telephone.trim(),
      email_verifie: false,
      verification_token: token,
      adresse: body.adresse.trim(),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      departement: geo.departement,
      region: geo.region,
      surface_estimee_m2: body.surface_estimee_m2 ?? null,
      deja_equipe_partiel: !!body.deja_equipe_partiel,
      derogation_pente: !!body.derogation_pente,
      derogation_abf: !!body.derogation_abf,
      budget_indicatif: body.budget_indicatif?.trim() || null,
      delai_souhaite: body.delai_souhaite?.trim() || null,
      notes_particulieres: body.notes_particulieres?.trim() || null,
      photos_urls: null,
      consentement_rgpd: true,
      est_personne_publique: false,
      acceptation_conditions_deposant: true,
      deposant_user_id: userId,
      ao_publie_officiellement: official.ao_publie_officiellement,
      lien_consultation_officielle: official.lien_consultation_officielle,
      date_limite_offres: official.date_limite_offres,
      nombre_places: official.nombre_places,
      type_proprietaire: official.type_proprietaire,
      parking_deja_etudie: official.parking_deja_etudie,
      documents_complementaires: official.documents_complementaires,
      type_solution_recherchee: typeSolution,
    });

    const emailSent = await sendRfpVerificationEmail(
      contactEmail,
      verifyUrl,
      row.entreprise,
    );

    return Response.json(
      {
        id: row.id,
        message:
          "Demande enregistrée. Confirmez votre email pour passer en modération (publication sous 48 h).",
        email_sent: emailSent,
        verify_url_dev:
          process.env.NODE_ENV === "development" && !emailSent ? verifyUrl : undefined,
      },
      { status: 201, headers: NO_STORE },
    );
  } catch (e) {
    return Response.json(
      { error: "Échec enregistrement.", details: String(e) },
      { status: 500, headers: NO_STORE },
    );
  }
}
