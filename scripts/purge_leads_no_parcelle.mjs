// Supprime de Supabase tous les leads sans parcelle cadastrale (id_parcelle IS NULL).
// Usage : node scripts/purge_leads_no_parcelle.mjs [--dry-run]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : process.env[key];
}

const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const BATCH = 500;

async function countNoParcelle() {
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("id_parcelle", null);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const before = await countNoParcelle();
  console.log(`Leads sans parcelle : ${before}`);
  if (before === 0) {
    console.log("Rien à supprimer.");
    return;
  }
  if (dryRun) {
    console.log(`(--dry-run) ${before} leads seraient supprimés.`);
    return;
  }

  let deleted = 0;
  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .is("id_parcelle", null)
      .limit(BATCH);
    if (error) throw error;
    if (!data?.length) break;

    const ids = data.map((r) => r.id);
    const { error: delErr } = await supabase.from("leads").delete().in("id", ids);
    if (delErr) throw delErr;
    deleted += ids.length;
    if (deleted % 2000 === 0 || ids.length < BATCH) {
      console.log(`  ${deleted} supprimés…`);
    }
  }

  const after = await countNoParcelle();
  const { count: total } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });
  console.log(`✅ Terminé : ${deleted} supprimés. Restants en base : ${total} (sans parcelle : ${after})`);
}

main().catch((e) => {
  console.error("ERREUR:", e.message || e);
  process.exit(1);
});
