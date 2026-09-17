import { Resend } from "resend";
import { LeadRow } from "./types";
import { euros, nf, formatCoords } from "./format";
import type { ProfilAcheteur } from "./profil-acheteur";

// Envoi d'emails via Resend. Si RESEND_API_KEY est absent, on ne lève pas
// d'erreur : on log et on renvoie false (la vente reste valide, l'acheteur
// retrouve son lead dans son espace client).
let _resend: Resend | null = null;

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function getResend(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.RESEND_FROM || "SolarIndex <leads@solarindex.fr>";

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:6px 12px;color:#64748b;border-bottom:1px solid #eef2f7;">${label}</td>
    <td style="padding:6px 12px;color:#0f172a;font-weight:600;border-bottom:1px solid #eef2f7;">${value}</td>
  </tr>`;
}

// CSV mono-ligne attaché à l'email (tous les champs débloqués).
function leadCsv(lead: LeadRow): string {
  const cols: (keyof LeadRow)[] = [
    "id", "departement", "region", "ville", "adresse", "surface_m2",
    "surface_solaire_m2", "puissance_kwc", "valeur_chantier_eur", "flag_urgence",
    "code_insee", "id_parcelle", "siren", "raison_sociale", "code_naf",
    "libelle_naf", "dirigeant_exploitant", "dirigeant_exploitant_qualite",
    "dirigeant_proprietaire", "dirigeant_proprietaire_qualite",
    "proprietaire_foncier", "siren_proprietaire_foncier",
    "latitude", "longitude",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(";");
  const line = cols.map((c) => esc(lead[c])).join(";");
  return `${header}\n${line}\n`;
}

export async function sendRegionalNotificationEmail(
  to: string[],
  subject: string,
  htmlBody: string,
): Promise<{ sent: number; failed: number }> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY absent — notification régionale non envoyée.");
    return { sent: 0, failed: to.length };
  }
  let sent = 0;
  let failed = 0;
  for (const email of to) {
    try {
      await getResend().emails.send({
        from: FROM,
        to: email,
        subject,
        html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#0f172a;">
          ${htmlBody}
          <p style="margin-top:24px;color:#94a3b8;font-size:12px;">SolarIndex — notification géographique</p>
        </div>`,
      });
      sent += 1;
    } catch (e) {
      console.error("[email] notification régionale:", email, e);
      failed += 1;
    }
  }
  return { sent, failed };
}

export async function sendLeadDeliveryEmail(
  to: string,
  lead: LeadRow,
  context?: { profilAcheteur?: ProfilAcheteur },
): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY absent — email de livraison non envoyé.");
    return false;
  }
  const profilAcheteur = context?.profilAcheteur ?? "installateur";
  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const subject = `Votre lead SolarIndex — ${lead.ville || "Parking"} (${lead.departement}) · ${nf(lead.surface_m2)} m²`;
  const intro =
    profilAcheteur === "tiers_investisseur"
      ? `<p style="color:#475569;">Merci pour votre achat. Voici la fiche complète pour étudier une proposition de financement (loyer / PPA).</p>`
      : `<p style="color:#475569;">Merci pour votre achat. Voici la fiche complète du prospect.</p>`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;">
    <h1 style="font-size:20px;color:#0f172a;">Votre lead est débloqué</h1>
    ${intro}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
      ${row("Exploitant", lead.raison_sociale)}
      ${row("SIREN exploitant", lead.siren)}
      ${row("Dirigeant exploitant", lead.dirigeant_exploitant ?? lead.dirigeant_nom)}
      ${row("Propriétaire foncier", lead.proprietaire_foncier)}
      ${row("SIREN propriétaire", lead.siren_proprietaire_foncier)}
      ${row("Dirigeant propriétaire", lead.dirigeant_proprietaire)}
      ${row("Adresse", lead.adresse)}
      ${row("Coordonnées GPS", formatCoords(lead.latitude, lead.longitude))}
      ${row("Ville", `${lead.ville || "—"} (${lead.departement})`)}
      ${row("Parcelle cadastrale", lead.id_parcelle)}
      ${row("Surface parking", `${nf(lead.surface_m2)} m²`)}
      ${row("Puissance estimée", `${nf(lead.puissance_kwc)} kWc`)}
      ${row("Valeur chantier", euros(lead.valeur_chantier_eur))}
    </table>
    <p style="margin-top:20px;">
      <a href="${appUrl}/mon-espace" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Voir dans mon espace</a>
    </p>
  </div>`;

  try {
    await getResend().emails.send({
      from: FROM,
      to,
      subject,
      html,
      attachments: [
        {
          filename: `lead-${lead.id}.csv`,
          content: Buffer.from(leadCsv(lead)).toString("base64"),
        },
      ],
    });
    return true;
  } catch (e) {
    console.error("[email] échec d'envoi Resend:", e);
    return false;
  }
}
