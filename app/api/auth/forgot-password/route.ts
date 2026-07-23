import { NextResponse } from "next/server";
import { sendAuthPasswordResetEmail } from "@/lib/auth-signup-email";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENERIC_OK =
  "Si un compte existe avec cet email, vous recevrez un lien pour choisir un nouveau mot de passe.";

export async function POST(req: Request) {
  let body: { email?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const redirectTo = body.redirectTo?.trim();

  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }
  if (!redirectTo?.startsWith("http")) {
    return NextResponse.json({ error: "URL de redirection invalide." }, { status: 400 });
  }

  try {
    const { data, error } = await getAdminClient().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error) {
      console.warn("[auth/forgot-password]", error.message);
      return NextResponse.json({ ok: true, message: GENERIC_OK });
    }

    const resetLink = data.properties?.action_link;
    if (!resetLink) {
      console.warn("[auth/forgot-password] lien absent pour", email);
      return NextResponse.json({ ok: true, message: GENERIC_OK });
    }

    const sent = await sendAuthPasswordResetEmail(email, resetLink);
    if (!sent) {
      console.error("[auth/forgot-password] Resend échec pour", email);
    }

    return NextResponse.json({
      ok: true,
      message: GENERIC_OK,
      reset_url_dev:
        process.env.NODE_ENV === "development" && !sent ? resetLink : undefined,
    });
  } catch (e) {
    console.error("[auth/forgot-password]", e);
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  }
}
