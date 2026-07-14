import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminClientsByRegion,
  getProfileEmails,
  profileIdsForRegion,
} from "@/lib/admin-data";
import { sendRegionalNotificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { region?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }

  const region = body.region?.trim();
  const subject = body.subject?.trim();
  const message = body.message?.trim();

  if (!region || !subject || !message) {
    return Response.json(
      { error: "region, subject et message sont requis." },
      { status: 400 },
    );
  }

  try {
    const groups = await getAdminClientsByRegion();
    const userIds = profileIdsForRegion(groups, region);
    const emails = await getProfileEmails(userIds);

    if (emails.length === 0) {
      return Response.json(
        { error: "Aucun email client pour cette région." },
        { status: 404 },
      );
    }

    const html = message
      .split("\n")
      .map((line) => `<p style="margin:0 0 12px;line-height:1.5;">${escapeHtml(line)}</p>`)
      .join("");

    const result = await sendRegionalNotificationEmail(emails, subject, html);
    return Response.json({
      ok: true,
      region,
      recipients: emails.length,
      ...result,
    });
  } catch (e) {
    console.error("[admin/notify]", e);
    return Response.json({ error: "Envoi impossible." }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
