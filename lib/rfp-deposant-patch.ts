import { getRfpById, updateRfpSubmission } from "./rfp-db";
import { RFP_DEPOSANT_EDITABLE_STATUTS } from "./rfp-deposant-edit";
import { inferGeoFromAddress, type RfpSubmissionRow } from "./rfp";
import { validateRfpOfficialFields } from "./rfp-official-fields";
import { parseTypeSolutionRecherchee } from "./solution-type";
import { verifySiret } from "./sirene";
import { isRfpDeposant } from "./rfp-withdrawal";

export interface DeposantRfpUpdateBody {
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
  type_solution_recherchee?: string;
  ao_publie_officiellement?: boolean;
  lien_consultation_officielle?: string;
  date_limite_offres?: string;
  nombre_places?: number | string;
  type_proprietaire?: string;
  parking_deja_etudie?: boolean;
  documents_complementaires?: string;
  acceptation_reference_officielle?: boolean;
}

export async function patchRfpAsDeposant(
  rfpId: string,
  userId: string,
  email: string,
  body: DeposantRfpUpdateBody,
): Promise<{ ok: true; row: RfpSubmissionRow } | { ok: false; error: string; status: number }> {
  const existing = await getRfpById(rfpId);
  if (!existing) {
    return { ok: false, error: "Appel d'offres introuvable.", status: 404 };
  }
  if (!isRfpDeposant(existing, userId, email)) {
    return { ok: false, error: "Vous n'êtes pas autorisé à modifier ce dépôt.", status: 403 };
  }
  if (!RFP_DEPOSANT_EDITABLE_STATUTS.includes(existing.statut)) {
    return { ok: false, error: "Ce dépôt ne peut plus être modifié.", status: 403 };
  }

  const contactEmail = (body.contact_email ?? "").trim().toLowerCase();
  if (!body.contact_nom?.trim() || !contactEmail || !body.contact_telephone?.trim()) {
    return { ok: false, error: "Contact incomplet.", status: 400 };
  }
  if (!body.adresse?.trim()) {
    return { ok: false, error: "Adresse requise.", status: 400 };
  }
  const typeSolution = parseTypeSolutionRecherchee(body.type_solution_recherchee);
  if (!typeSolution) {
    return { ok: false, error: "Type de solution recherchée invalide.", status: 400 };
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
    return { ok: false, error: officialCheck.error, status: 400 };
  }
  if (officialCheck.data.ao_publie_officiellement && !body.acceptation_reference_officielle) {
    return {
      ok: false,
      error:
        "Acceptez la déclaration sur le lien officiel (autorisation de référencement et consultation du DCE sur la plateforme indiquée).",
      status: 400,
    };
  }

  const siretCheck = body.siret?.trim()
    ? await verifySiret(body.siret)
    : { ok: false as const, siret: "", siren: "", entreprise: "", error: "SIRET requis." };
  if (!siretCheck.ok) {
    return { ok: false, error: siretCheck.error || "SIRET non vérifié.", status: 400 };
  }

  const official = officialCheck.data;
  const geo = inferGeoFromAddress(body.adresse);

  const row = await updateRfpSubmission(
    rfpId,
    {
      entreprise: siretCheck.entreprise || body.entreprise?.trim() || "",
      siret: siretCheck.siret,
      siret_verifie: true,
      contact_nom: body.contact_nom.trim(),
      contact_fonction: body.contact_fonction?.trim() || null,
      contact_email: contactEmail,
      contact_telephone: body.contact_telephone.trim(),
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
      ao_publie_officiellement: official.ao_publie_officiellement,
      lien_consultation_officielle: official.lien_consultation_officielle,
      date_limite_offres: official.date_limite_offres,
      nombre_places: official.nombre_places,
      type_proprietaire: official.type_proprietaire,
      parking_deja_etudie: official.parking_deja_etudie,
      documents_complementaires: official.documents_complementaires,
      type_solution_recherchee: typeSolution,
    },
    RFP_DEPOSANT_EDITABLE_STATUTS,
  );

  return { ok: true, row };
}
