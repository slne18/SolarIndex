import { requireAdmin } from "@/lib/admin-auth";
import {
  moderateRfpSubmission,
  queryRfpModerationQueue,
} from "@/lib/rfp-db";
import {
  sendRfpPublishedEmail,
  sendRfpRejectedEmail,
} from "@/lib/email-rfp";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const rfps = await queryRfpModerationQueue();
    return Response.json({ rfps, total: rfps.length });
  } catch (e) {
    console.error("[admin/rfp GET]", e);
    return Response.json({ error: "Impossible de charger la file de modération." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = (await req.json()) as { id?: string; action?: string };
    const id = body.id?.trim();
    const action = body.action;
    if (!id || (action !== "publie" && action !== "rejete")) {
      return Response.json(
        { error: "Corps attendu : { id, action: 'publie' | 'rejete' }." },
        { status: 400 },
      );
    }
    const row = await moderateRfpSubmission(id, action);
    const emailSent =
      action === "publie"
        ? await sendRfpPublishedEmail(row)
        : await sendRfpRejectedEmail(row);
    return Response.json({ rfp: row, email_sent: emailSent });
  } catch (e) {
    console.error("[admin/rfp PATCH]", e);
    const msg = e instanceof Error ? e.message : "Modération échouée.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
