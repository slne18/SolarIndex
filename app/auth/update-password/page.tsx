"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import PasswordInput from "@/components/PasswordInput";
import { useTranslations } from "@/components/LocaleProvider";

function UpdatePasswordInner() {
  const t = useTranslations();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setCanReset(true);
        setReady(true);
      }
    });

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        setMsg(t("auth.resetInvalidLink"));
        setReady(true);
        return;
      }
      if (data.session) {
        setCanReset(true);
      } else {
        setMsg(t("auth.resetInvalidLink"));
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setMsg(t("auth.error.weakPassword"));
      return;
    }
    if (password !== confirm) {
      setMsg(t("auth.resetMismatch"));
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const { error } = await getBrowserClient().auth.updateUser({ password });
      if (error) throw error;
      setMsg(t("auth.resetSuccess"));
      window.setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("auth.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <p className="text-slate-400">{t("common.loading")}</p>;
  }

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-md">
        <Link href="/login" className="text-sm text-slate-400 hover:text-white">
          {t("auth.backToSignIn")}
        </Link>
        <div className="card mt-4 p-7">
          <h1 className="text-2xl font-bold tracking-tight">{t("auth.resetTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("auth.resetLead")}</p>

          {canReset ? (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  {t("auth.resetNewPassword")}
                </span>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  showLabel={t("auth.showPassword")}
                  hideLabel={t("auth.hidePassword")}
                  required
                  minLength={6}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  {t("auth.resetConfirmPassword")}
                </span>
                <PasswordInput
                  value={confirm}
                  onChange={setConfirm}
                  showLabel={t("auth.showPassword")}
                  hideLabel={t("auth.hidePassword")}
                  required
                  minLength={6}
                />
              </label>
              <button type="submit" disabled={loading} className="btn-solar w-full">
                {loading ? t("auth.resetSubmitting") : t("auth.resetSubmit")}
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-slate-400">
              {msg ?? t("auth.resetInvalidLink")}{" "}
              <Link href="/login?mode=forgot" className="text-solar underline">
                {t("auth.forgotLink")}
              </Link>
            </p>
          )}

          {canReset && msg ? <p className="mt-4 text-sm text-solar-400">{msg}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="container-x py-16 text-slate-400">…</div>}>
      <UpdatePasswordInner />
    </Suspense>
  );
}
