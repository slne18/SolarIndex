import { Resend } from "resend";
import { isEmailConfigured } from "./email";

const FROM = process.env.RESEND_FROM || "SolarIndex <contact@solarindex.fr>";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!isEmailConfigured()) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function shell(title: string, body: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;color:#0f172a;">
    <p style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">SolarIndex</p>
    <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
    ${body}
    <p style="margin-top:28px;color:#94a3b8;font-size:12px;">SolarIndex — solarindex.fr</p>
  </div>`;
}

/** Email de confirmation de compte (inscription), envoyé via Resend — pas le SMTP Supabase. */
export async function sendAuthConfirmEmail(to: string, confirmUrl: string): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.warn("[auth-signup-email] RESEND_API_KEY absent — email de confirmation non envoyé.");
    return false;
  }

  const html = shell(
    "Confirmez votre compte",
    `<p style="color:#475569;">Bienvenue sur SolarIndex. Cliquez ci-dessous pour confirmer votre adresse email et accéder à votre espace.</p>
    <p style="margin:24px 0;">
      <a href="${confirmUrl}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Confirmer mon email</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">Si le bouton ne fonctionne pas :<br/><a href="${confirmUrl}" style="color:#64748b;word-break:break-all;">${confirmUrl}</a></p>`,
  );

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to,
      subject: "SolarIndex — Confirmez votre compte",
      html,
    });
    if (error) {
      console.error("[auth-signup-email] échec envoi:", to, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[auth-signup-email] échec envoi:", to, e);
    return false;
  }
}

/** Email de réinitialisation de mot de passe (Resend — pas le SMTP Supabase). */
export async function sendAuthPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.warn("[auth-signup-email] RESEND_API_KEY absent — email de réinitialisation non envoyé.");
    return false;
  }

  const html = shell(
    "Réinitialisez votre mot de passe",
    `<p style="color:#475569;">Vous avez demandé à réinitialiser votre mot de passe SolarIndex. Cliquez ci-dessous pour en choisir un nouveau.</p>
    <p style="margin:24px 0;">
      <a href="${resetUrl}" style="background:#f59e0b;color:#0f172a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Choisir un nouveau mot de passe</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Lien direct :<br/><a href="${resetUrl}" style="color:#64748b;word-break:break-all;">${resetUrl}</a></p>`,
  );

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to,
      subject: "SolarIndex — Réinitialisation de mot de passe",
      html,
    });
    if (error) {
      console.error("[auth-signup-email] échec reset:", to, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[auth-signup-email] échec reset:", to, e);
    return false;
  }
}
