import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Next.js patche `fetch` et met en cache (sur disque) les réponses dans les
// Server Components. supabase-js utilise fetch en interne : sans cela, les
// lectures serveur servent des données périmées. On force donc `no-store`.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

// Client "service role" : bypasse la RLS. À n'utiliser QUE côté serveur
// (ingestion, lectures admin, webhooks). Jamais exposé au navigateur.
let _admin: SupabaseClient | null = null;
export function getAdminClient(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Config Supabase manquante : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.",
    );
  }
  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: noStoreFetch },
  });
  return _admin;
}

// Client "anon" utilisé pour valider le JWT d'un utilisateur (auth.getUser).
let _anon: SupabaseClient | null = null;
export function getAnonClient(): SupabaseClient {
  if (_anon) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Config Supabase manquante : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY requis.",
    );
  }
  _anon = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: noStoreFetch },
  });
  return _anon;
}
