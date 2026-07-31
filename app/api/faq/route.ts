import { createFaqSubmission, queryPublishedFaqEntries } from "@/lib/faq-db";
import { sendFaqSubmissionAdminEmail } from "@/lib/email-faq";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

interface SubmitBody {
  question?: string;
  email?: string;
  website?: string;
}

function localeFromRequest(req: Request): Locale {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("locale");
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** GET /api/faq — entrées publiées (complément des FAQ statiques i18n). */
export async function GET(req: Request) {
  try {
    const locale = localeFromRequest(req);
    const entries = await queryPublishedFaqEntries(locale);
    return Response.json({ entries }, { headers: NO_STORE });
  } catch (e) {
    console.error("[GET /api/faq]", e);
    return Response.json({ error: "Impossible de charger la FAQ." }, { status: 500 });
  }
}

/** POST /api/faq — soumettre une question depuis la page FAQ. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SubmitBody;

    if (body.website?.trim()) {
      return Response.json({ ok: true });
    }

    const question = body.question?.trim() ?? "";
    const email = body.email?.trim() || undefined;

    const entry = await createFaqSubmission({ question, senderEmail: email });
    const emailSent = await sendFaqSubmissionAdminEmail(entry);

    return Response.json({ ok: true, id: entry.id, email_sent: emailSent > 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Envoi impossible.";
    console.error("[POST /api/faq]", e);
    return Response.json({ error: msg }, { status: 400 });
  }
}
