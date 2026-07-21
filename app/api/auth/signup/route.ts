import { NextResponse } from "next/server";
import { sendAuthConfirmEmail } from "@/lib/auth-signup-email";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapAuthError(message: string, code?: string): { status: number; error: string; code?: string } {
  const m = message.toLowerCase();
  if (code === "email_exists" || /already registered|already been registered|user already/i.test(m)) {
    return { status: 409, error: "Un compte existe déjà avec cet email.", code: "email_exists" };
  }
  if (code === "weak_password" || /password.*at least|password.*short/i.test(m)) {
    return { status: 400, error: "Mot de passe trop court (6 caractères minimum).", code: "weak_password" };
  }
  if (code === "email_address_invalid" || /email.*invalid/i.test(m)) {
    return {
      status: 400,
      error: "Adresse email refusée. Utilisez une adresse réaliste.",
      code: "email_address_invalid",
    };
  }
  return { status: 400, error: message, code };
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const redirectTo = body.redirectTo?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Mot de passe trop court (6 caractères minimum).", code: "weak_password" },
      { status: 400 },
    );
  }
  if (!redirectTo?.startsWith("http")) {
    return NextResponse.json({ error: "URL de redirection invalide." }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo },
  });

  if (error) {
    const mapped = mapAuthError(error.message, error.code);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }

  const actionLink = data.properties?.action_link;
  const userId = data.user?.id;
  if (!actionLink || !userId) {
    return NextResponse.json({ error: "Impossible de générer le lien de confirmation." }, { status: 500 });
  }

  const sent = await sendAuthConfirmEmail(email, actionLink);
  if (sent) {
    return NextResponse.json({ ok: true, needsConfirmation: true });
  }

  // Resend indisponible : confirmer le compte pour ne pas bloquer l'inscription.
  const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (confirmErr) {
    console.error("[auth/signup] auto-confirm failed:", confirmErr);
    return NextResponse.json(
      {
        error:
          "Compte créé mais l'email de confirmation n'a pas pu être envoyé. Contactez le support ou réessayez plus tard.",
        code: "email_send_failed",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, autoConfirmed: true });
}
