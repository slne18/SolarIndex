import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Client Supabase côté navigateur (persistance de session activée) — utilisé
// par l'espace client et le tunnel d'achat pour récupérer le JWT de l'acheteur.
let _client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Config Supabase manquante côté navigateur. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local, puis redémarrez npm run dev.",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}

// Renvoie le token d'accès de la session courante (ou null si non connecté).
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getBrowserClient().auth.getSession();
  return data.session?.access_token ?? null;
}
