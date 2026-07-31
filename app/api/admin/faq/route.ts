import { requireAdmin } from "@/lib/admin-auth";
import {
  archiveFaqEntry,
  publishFaqEntry,
  queryFaqSubmissionQueue,
} from "@/lib/faq-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const entries = await queryFaqSubmissionQueue();
    return Response.json({ entries, total: entries.length });
  } catch (e) {
    console.error("[admin/faq GET]", e);
    return Response.json({ error: "Impossible de charger la file FAQ." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as {
      id?: string;
      action?: string;
      answer_fr?: string;
      answer_en?: string;
    };
    const id = body.id?.trim();
    const action = body.action;

    if (!id || (action !== "publie" && action !== "archive")) {
      return Response.json(
        { error: "Corps attendu : { id, action: 'publie' | 'archive', answer_fr? }." },
        { status: 400 },
      );
    }

    const entry =
      action === "publie"
        ? await publishFaqEntry(id, {
            answerFr: body.answer_fr ?? "",
            answerEn: body.answer_en,
          })
        : await archiveFaqEntry(id);

    return Response.json({ entry });
  } catch (e) {
    console.error("[admin/faq PATCH]", e);
    const msg = e instanceof Error ? e.message : "Modération échouée.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
