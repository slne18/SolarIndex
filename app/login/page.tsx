"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { authConfirmRedirectUrl, resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { useTranslations } from "@/components/LocaleProvider";
import PasswordInput from "@/components/PasswordInput";
import type { MessageKey } from "@/lib/i18n";

export default function LoginPage() {
  const t = useTranslations();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("mode") === "signup") setMode("signup");
  }, []);

  function defaultNext(isSignup: boolean): string {
    if (typeof window === "undefined") return "/mon-espace";
    const sp = new URLSearchParams(window.location.search);
    const next = sp.get("next");
    if (isSignup && (!next || next === "/leads" || next.startsWith("/leads"))) {
      return "/leads";
    }
    return next || "/mon-espace";
  }

  function authErrorMessage(err: unknown): string {
    if (!(err instanceof Error)) return t("auth.error.generic");
    const code = "code" in err ? String((err as { code?: string }).code) : "";
    const msg = err.message;
    if (code === "email_address_invalid" || /email.*invalid/i.test(msg)) {
      return t("auth.error.emailInvalid");
    }
    if (code === "email_exists" || /already registered/i.test(msg)) {
      return t("auth.error.emailExists");
    }
    if (code === "weak_password" || /password.*at least/i.test(msg)) {
      return t("auth.error.weakPassword");
    }
    if (
      code === "over_email_send_rate_limit" ||
      /rate limit|too many.*email|email.*limit/i.test(msg)
    ) {
      return t("auth.error.rateLimit");
    }
    if (/error sending email|email send failed|email_send_failed/i.test(msg)) {
      return t("auth.error.emailSend");
    }
    return msg;
  }

  async function redirectAfterAuth(token: string, isSignup: boolean) {
    const destination = await resolvePostAuthRedirect(token, defaultNext(isSignup));
    window.location.href = destination;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = getBrowserClient();
    const next = defaultNext(mode === "signup");
    try {
      if (mode === "signup") {
        const redirectTo = authConfirmRedirectUrl(`/onboarding?next=${encodeURIComponent(next)}`);
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, redirectTo }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(payload.error || t("auth.error.generic")) as Error & { code?: string };
          if (payload.code) err.code = payload.code;
          throw err;
        }

        if (payload.autoConfirmed) {
          setMsg(t("auth.signUpAutoConfirmed"));
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          const token = data.session?.access_token;
          if (!token) throw new Error("Session introuvable.");
          await redirectAfterAuth(token, true);
          return;
        }

        setMsg(t("auth.signUpConfirmEmail"));
        setMode("signin");
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const token = data.session?.access_token;
        if (!token) throw new Error("Session introuvable.");
        await redirectAfterAuth(token, false);
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
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          {t("common.backHome")}
        </Link>
        <div className="card mt-4 p-7">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "signin" ? t("auth.signInLead") : t("auth.signUpLead")}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label={t("auth.email")}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder={t("auth.emailPlaceholder")}
              />
            </Field>
            <Field label={t("auth.password")}>
              <PasswordInput
                value={password}
                onChange={setPassword}
                showLabel={t("auth.showPassword")}
                hideLabel={t("auth.hidePassword")}
                required
              />
            </Field>

            <button type="submit" disabled={loading} className="btn-solar w-full">
              {loading
                ? "…"
                : mode === "signin"
                  ? t("auth.signInSubmit")
                  : t("auth.signUpSubmit")}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm text-solar-400">{msg}</p>}

          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMsg(null);
            }}
            className="mt-5 text-sm text-slate-400 hover:text-white"
          >
            {mode === "signin" ? t("auth.switchToSignUp") : t("auth.switchToSignIn")}
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
