import { requireAdmin } from "@/lib/admin-auth";
import {
  archiveFaqEntry,
  deleteFaqEntry,
  publishFaqEntry,
  queryFaqSubmissionQueue,
  queryPublishedFaqEntriesAdmin,
} from "@/lib/faq-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const [submissions, published] = await Promise.all([
      queryFaqSubmissionQueue(),
      queryPublishedFaqEntriesAdmin(),
    ]);
    return Response.json({
      entries: submissions,
      published,
      total: submissions.length,
      publishedTotal: published.length,
    });
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
      question_en?: string;
    };
    const id = body.id?.trim();
    const action = body.action;

    if (!id || !action) {
      return Response.json({ error: "Corps attendu : { id, action }." }, { status: 400 });
    }

    if (action === "supprime") {
      await deleteFaqEntry(id);
      return Response.json({ ok: true });
    }

    if (action !== "publie" && action !== "archive") {
      return Response.json(
        { error: "action attendue : 'publie' | 'archive' | 'supprime'." },
        { status: 400 },
      );
    }

    const entry =
      action === "publie"
        ? await publishFaqEntry(id, {
            answerFr: body.answer_fr ?? "",
            answerEn: body.answer_en,
            questionEn: body.question_en,
          })
        : await archiveFaqEntry(id);

    return Response.json({ entry });
  } catch (e) {
    console.error("[admin/faq PATCH]", e);
    const msg = e instanceof Error ? e.message : "Modération échouée.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
