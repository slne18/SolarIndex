import { randomBytes } from "crypto";
import { getUserIdFromRequest } from "@/lib/auth";
import { queryRfpSubmissions, RFP_PAGE_SIZE, createRfpSubmission } from "@/lib/rfp-db";
import { inferGeoFromAddress, toPublicRfp, type RfpStatut } from "@/lib/rfp";
import {
  type RfpDeposantChecklistId,
  validateRfpDeposantDeclarations,
} from "@/lib/rfp-legal";
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
  acceptation_cgv_deposant?: boolean;
  consentement_rgpd?: boolean;
  checklist?: Partial<Record<RfpDeposantChecklistId, boolean>>;
}

// GET /api/rfp — catalogue appels d'offres publiés (masqué)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const departement = searchParams.get("departement") || undefined;
  const region = searchParams.get("region") || undefined;
  const surfaceMinRaw = searchParams.get("surface_min");
  const surfaceMin = surfaceMinRaw ? Number(surfaceMinRaw) : undefined;
  const pageRaw = Number(searchParams.get("page") || "0");
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? Math.floor(pageRaw) : 0;

  try {
    const { rows, count } = await queryRfpSubmissions({
      departement,
      region,
      surfaceMin,
      page,
    });
    return Response.json(
      {
        rfps: rows.map(toPublicRfp),
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
  if (!(await getUserIdFromRequest(req))) {
    return Response.json({ error: "Compte requis pour soumettre un appel d'offres." }, { status: 401, headers: NO_STORE });
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
  const legalCheck = validateRfpDeposantDeclarations({
    est_personne_publique: !!body.est_personne_publique,
    acceptation_non_marche_public: !!body.acceptation_non_marche_public,
    acceptation_mise_en_relation: !!body.acceptation_mise_en_relation,
    acceptation_multi_installateurs: !!body.acceptation_multi_installateurs,
    acceptation_exactitude: !!body.acceptation_exactitude,
    acceptation_sans_garantie: !!body.acceptation_sans_garantie,
    acceptation_cgv_deposant: !!body.acceptation_cgv_deposant,
    consentement_rgpd: !!body.consentement_rgpd,
    checklist: body.checklist,
  });
  if (!legalCheck.ok) {
    return Response.json({ error: legalCheck.error }, { status: 400, headers: NO_STORE });
  }

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
