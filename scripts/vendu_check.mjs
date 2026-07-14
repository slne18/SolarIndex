// Test live de la règle "skip vendu" : marque/réinitialise un lead via Supabase.
//   node scripts/vendu_check.mjs mark      → passe 1 lead à 'vendu', imprime son osm_id
//   node scripts/vendu_check.mjs reset <id> → remet le lead à 'disponible'
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : process.env[key];
}

const supabase = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

const action = process.argv[2];

if (action === "mark") {
  const { data } = await supabase
    .from("leads")
    .select("id, osm_id")
    .order("valeur_chantier_eur", { ascending: false })
    .limit(1)
    .single();
  await supabase.from("leads").update({ statut: "vendu", vendu_at: new Date().toISOString() }).eq("id", data.id);
  console.log(JSON.stringify(data));
} else if (action === "reset") {
  await supabase
    .from("leads")
    .update({ statut: "disponible", vendu_at: null })
    .eq("id", process.argv[3]);
  console.log("reset ok");
}
