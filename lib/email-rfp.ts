import { Resend } from "resend";
import type { RfpSubmissionRow } from "./rfp";
import { isEmailConfigured } from "./email";
import { adminEmailRecipients } from "./email-config";
import { nf } from "./format";

export { adminEmailRecipients } from "./email-config";

const FROM = process.env.RESEND_FROM || "SolarIndex <contact@solarindex.fr>";
const APP_URL = process.env.NEXT_PUBLIC_URL || "https://solarindex.fr";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!isEmailConfigured()) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function shell(title: string, body: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;color:#0f172a;">
    <p style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">SolarIndex · Consultations installateurs</p>
    <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
    ${body}
    <p style="margin-top:28px;color:#94a3b8;font-size:12px;">SolarIndex — solarindex.fr</p>
  </div>`;
}

async function sendOne(to: string, subject: string, html: string): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.warn("[email-rfp] RESEND_API_KEY absent — email non envoyé:", subject);
    return false;
  }
  try {
    const { error } = await client.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email-rfp] échec envoi:", to, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email-rfp] échec envoi:", to, e);
    return false;
  }
}

function rfpSummary(rfp: Pick<RfpSubmissionRow, "entreprise" | "adresse" | "departement" | "region" | "surface_estimee_m2">): string {
  const surface = rfp.surface_estimee_m2 ? `${nf(rfp.surface_estimee_m2)} m²` : "—";
  const loc = [rfp.departement, rfp.region].filter(Boolean).join(" · ") || "—";
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#64748b;">Entreprise</td><td style="padding:6px 0;font-weight:600;">${rfp.entreprise || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Adresse</td><td style="padding:6px 0;">${rfp.adresse || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Localisation</td><td style="padding:6px 0;">${loc}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Surface estimée</td><td style="padding:6px 0;">${surface}</td></tr>
  </table>`;
}

/** Email au déposant : confirmer l'adresse (lien de vérification). */
export async function sendRfpVerificationEmail(
  to: string,
  verifyUrl: string,
  entreprise: string,
): Promise<boolean> {
  const html = shell(
    "Confirmez votre email",
    `<p style="color:#475569;">Votre projet de consultation installateurs pour <strong>${entreprise || "votre parking"}</strong> est enregistré.</p>
    <p style="color:#475569;">Cliquez ci-dessous pour confirmer votre adresse email. Ensuite, notre équipe modérera votre demande (sous 48 h ouvrées).</p>
    <p style="margin:24px 0;">
      <a href="${verifyUrl}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Confirmer mon email</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">Si le bouton ne fonctionne pas :<br/><a href="${verifyUrl}" style="color:#64748b;word-break:break-all;">${verifyUrl}</a></p>`,
  );
  return sendOne(to, "SolarIndex — Confirmez votre email (consultation installateurs)", html);
}

/** Alerte admin : nouveau dépôt (email déposant pas encore confirmé). */
export async function sendRfpNewSubmissionAdminEmail(rfp: RfpSubmissionRow): Promise<number> {
  const admins = adminEmailRecipients();
  if (!admins.length) return 0;
  const adminUrl = `${APP_URL}/admin`;
  const html = shell(
    "Nouveau dépôt de projet",
    `<p style="color:#475569;">Un gérant ou propriétaire vient de soumettre une consultation installateurs. Le déposant doit encore confirmer son email.</p>
    ${rfpSummary(rfp)}
    <p style="color:#475569;">Contact : ${rfp.contact_nom} · ${rfp.contact_email} · ${rfp.contact_telephone}</p>
    <p style="margin:24px 0;">
      <a href="${adminUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Ouvrir l'admin</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">Vous recevrez une seconde alerte lorsque l'email sera confirmé (file de modération). ID : ${rfp.id}</p>`,
  );
  let sent = 0;
  for (const email of admins) {
    if (
      await sendOne(
        email,
        `[SolarIndex] Nouveau dépôt RFP — ${rfp.entreprise || "projet"} (email à confirmer)`,
        html,
      )
    ) {
      sent += 1;
    }
  }
  return sent;
}

/** Alerte admin : nouveau projet en file de modération. */
export async function sendRfpModerationAlertEmail(rfp: RfpSubmissionRow): Promise<number> {
  const admins = adminEmailRecipients();
  if (!admins.length) return 0;
  const adminUrl = `${APP_URL}/admin`;
  const html = shell(
    "Nouveau projet à modérer",
    `<p style="color:#475569;">Un gérant a confirmé son email. Le projet est en file d'attente <strong>en_attente_moderation</strong>.</p>
    ${rfpSummary(rfp)}
    <p style="color:#475569;">Contact : ${rfp.contact_nom} · ${rfp.contact_email} · ${rfp.contact_telephone}</p>
    <p style="margin:24px 0;">
      <a href="${adminUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Ouvrir l'admin</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">ID : ${rfp.id}</p>`,
  );
  let sent = 0;
  for (const email of admins) {
    if (await sendOne(email, `[SolarIndex] Modération RFP — ${rfp.entreprise || "projet"}`, html)) {
      sent += 1;
    }
  }
  return sent;
}

/** Déposant : projet publié dans le catalogue installateurs. */
export async function sendRfpPublishedEmail(rfp: RfpSubmissionRow): Promise<boolean> {
  const catalogueUrl = `${APP_URL}/appels-offres`;
  const html = shell(
    "Votre projet est en ligne",
    `<p style="color:#475569;">Bonjour ${rfp.contact_nom},</p>
    <p style="color:#475569;">Votre consultation installateurs a été <strong>publiée</strong>. Jusqu'à ${rfp.acheteurs_max} installateurs professionnels pourront acheter l'accès à vos coordonnées pour vous proposer un devis.</p>
    ${rfpSummary(rfp)}
    <p style="margin:24px 0;">
      <a href="${catalogueUrl}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Voir le catalogue</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">Vous restez libre de choisir votre installateur. SolarIndex met en relation, sans engagement.</p>`,
  );
  return sendOne(rfp.contact_email, "SolarIndex — Votre projet est publié", html);
}

/** Déposant : projet refusé en modération. */
export async function sendRfpRejectedEmail(rfp: RfpSubmissionRow): Promise<boolean> {
  const html = shell(
    "Votre projet n'a pas été publié",
    `<p style="color:#475569;">Bonjour ${rfp.contact_nom},</p>
    <p style="color:#475569;">Après modération, votre demande de consultation installateurs n'a pas été publiée sur SolarIndex (critères éditoriaux, informations incomplètes ou non conformes à nos conditions déposant).</p>
    ${rfpSummary(rfp)}
    <p style="color:#475569;">Pour toute question : <a href="mailto:contact@solarindex.fr" style="color:#0f172a;">contact@solarindex.fr</a></p>`,
  );
  return sendOne(rfp.contact_email, "SolarIndex — Mise à jour de votre projet", html);
}

function rfpContactRows(
  rfp: Pick<
    RfpSubmissionRow,
    "contact_nom" | "contact_fonction" | "contact_email" | "contact_telephone" | "entreprise" | "siret"
  >,
): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#64748b;">Entreprise</td><td style="padding:6px 0;font-weight:600;">${rfp.entreprise || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">SIRET</td><td style="padding:6px 0;">${rfp.siret || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Contact</td><td style="padding:6px 0;">${rfp.contact_nom || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Fonction</td><td style="padding:6px 0;">${rfp.contact_fonction || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;">${rfp.contact_email || "—"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Téléphone</td><td style="padding:6px 0;">${rfp.contact_telephone || "—"}</td></tr>
  </table>`;
}

/** Installateur : accès débloqué après paiement (coordonnées du déposant). */
export async function sendRfpAccessDeliveryEmail(
  to: string,
  rfp: RfpSubmissionRow,
): Promise<boolean> {
  const dept = rfp.departement || "?";
  const detailUrl = `${APP_URL}/appels-offres/${rfp.id}?from=mon-espace`;
  const html = shell(
    "Accès débloqué — consultation installateurs",
    `<p style="color:#475569;">Merci pour votre achat. Voici les coordonnées du déposant pour vous proposer un devis.</p>
    ${rfpSummary(rfp)}
    <p style="color:#475569;font-weight:600;margin:16px 0 8px;">Coordonnées directes</p>
    ${rfpContactRows(rfp)}
    <p style="margin:24px 0;">
      <a href="${detailUrl}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;margin-right:8px;">Voir la fiche</a>
      <a href="${APP_URL}/mon-espace" style="color:#0f172a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;border:1px solid #cbd5e1;display:inline-block;">Mon espace</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">Conservez cet email : vous retrouvez aussi cette fiche dans Mon espace → Mes appels d'offres achetés.</p>`,
  );
  return sendOne(
    to,
    `SolarIndex — Accès appel d'offres · ${rfp.entreprise || "projet"} (dép. ${dept})`,
    html,
  );
}
