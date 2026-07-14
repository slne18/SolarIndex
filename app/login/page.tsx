"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("mode") === "signup") setMode("signup");
  }, []);

  function nextUrl(isSignup: boolean): string {
    if (typeof window === "undefined") return "/mon-espace";
    const sp = new URLSearchParams(window.location.search);
    const next = sp.get("next");
    if (isSignup && (!next || next === "/leads" || next.startsWith("/leads"))) {
      return "/onboarding";
    }
    return next || "/mon-espace";
  }

  function authErrorMessage(err: unknown): string {
    if (!(err instanceof Error)) return "Échec de l'authentification.";
    const code = "code" in err ? String((err as { code?: string }).code) : "";
    const msg = err.message;
    if (code === "email_address_invalid" || /email.*invalid/i.test(msg)) {
      return "Adresse email refusée. Supabase bloque les adresses de test (ex. test@gmail.com). Utilisez une adresse réaliste, par ex. prenom.nom@gmail.com.";
    }
    if (code === "email_exists" || /already registered/i.test(msg)) {
      return "Un compte existe déjà avec cet email. Connectez-vous.";
    }
    if (code === "weak_password" || /password.*at least/i.test(msg)) {
      return "Mot de passe trop court (6 caractères minimum).";
    }
    return msg;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = getBrowserClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { entreprise } },
        });
        if (error) throw error;
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          setMsg("Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous.");
          setMode("signin");
          return;
        }
        window.location.href = nextUrl(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = nextUrl(false);
      }
    } catch (err) {
      setMsg(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Accueil</Link>
        <div className="card mt-4 p-7">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Connexion" : "Créer un espace installateur"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "signup"
              ? "Compte requis pour parcourir le catalogue et recevoir vos leads."
              : "Accédez à vos leads achetés et à votre échantillon gratuit."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field label="Entreprise">
                <input
                  value={entreprise}
                  onChange={(e) => setEntreprise(e.target.value)}
                  className="input"
                  placeholder="Ma société d'installation"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="vous@entreprise.fr"
              />
            </Field>
            <Field label="Mot de passe">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </Field>

            <button type="submit" disabled={loading} className="btn-solar w-full">
              {loading ? "…" : mode === "signin" ? "Se connecter" : "Créer mon espace"}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm text-solar-400">{msg}</p>}

          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}
            className="mt-5 text-sm text-slate-400 hover:text-white"
          >
            {mode === "signin"
              ? "Pas encore de compte ? Créer un espace"
              : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
