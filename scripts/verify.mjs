// Bilan base Supabase : total leads + répartition par région.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : process.env[key];
}
const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const { count, error: cErr } = await supabase
  .from("leads")
  .select("*", { count: "exact", head: true });
if (cErr) { console.error(cErr); process.exit(1); }
console.log(`TOTAL leads: ${count}`);

const perRegion = {};
const pageSize = 1000;
for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase
    .from("leads")
    .select("region")
    .range(from, from + pageSize - 1);
  if (error) { console.error(error); process.exit(1); }
  if (!data.length) break;
  for (const r of data) perRegion[r.region ?? "(null)"] = (perRegion[r.region ?? "(null)"] || 0) + 1;
  if (data.length < pageSize) break;
}

const rows = Object.entries(perRegion).sort((a, b) => b[1] - a[1]);
console.log(`\nRégions distinctes: ${rows.length}`);
for (const [region, n] of rows) console.log(`  ${String(n).padStart(5)}  ${region}`);
