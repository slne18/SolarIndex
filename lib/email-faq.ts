import { Resend } from "resend";
import type { FaqEntryRow } from "./faq-db";
import { isEmailConfigured } from "./email";
import { adminEmailRecipients } from "./email-config";

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
    <p style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">SolarIndex · FAQ</p>
    <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
    ${body}
    <p style="margin-top:28px;color:#94a3b8;font-size:12px;">SolarIndex — solarindex.fr</p>
  </div>`;
}

async function sendOne(to: string, subject: string, html: string): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.warn("[email-faq] RESEND_API_KEY absent — email non envoyé:", subject);
    return false;
  }
  try {
    const { error } = await client.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email-faq] échec envoi:", to, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email-faq] échec envoi:", to, e);
    return false;
  }
}

/** Alerte admin : nouvelle question FAQ soumise sur le site. */
export async function sendFaqSubmissionAdminEmail(entry: FaqEntryRow): Promise<number> {
  const admins = adminEmailRecipients();
  if (!admins.length) return 0;

  const adminUrl = `${APP_URL}/admin`;
  const senderLine = entry.sender_email
    ? `<p style="color:#475569;">Email du visiteur : <a href="mailto:${entry.sender_email}">${entry.sender_email}</a></p>`
    : "";

  const html = shell(
    "Nouvelle question FAQ",
    `<p style="color:#475569;">Un visiteur a posé une question depuis la page FAQ. Vous pouvez y répondre et la publier sur le site si vous le souhaitez.</p>
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #f59e0b;background:#fffbeb;color:#0f172a;">${entry.question_fr.replace(/\n/g, "<br/>")}</blockquote>
    ${senderLine}
    <p style="margin:24px 0;">
      <a href="${adminUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Modérer dans l'admin</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">ID : ${entry.id}</p>`,
  );

  let sent = 0;
  for (const email of admins) {
    if (await sendOne(email, "[SolarIndex] Nouvelle question FAQ", html)) sent += 1;
  }
  return sent;
}
