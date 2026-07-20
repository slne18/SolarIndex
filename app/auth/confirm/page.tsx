"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserClient } from "@/lib/supabaseBrowser";

function AuthConfirmInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Confirmation de votre email…");

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserClient();
    const next = sp.get("next") || "/onboarding";

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return;
      router.replace(next.startsWith("/") ? next : `/onboarding?next=${encodeURIComponent(next)}`);
    });

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        setMsg("Lien de confirmation invalide ou expiré. Connectez-vous avec votre mot de passe.");
        return;
      }

      if (data.session) {
        router.replace(next.startsWith("/") ? next : `/onboarding?next=${encodeURIComponent(next)}`);
        return;
      }

      setMsg("Email confirmé. Connectez-vous pour compléter votre profil.");
      const loginNext = next.startsWith("/onboarding")
        ? next
        : `/onboarding?next=${encodeURIComponent(next)}`;
      window.setTimeout(() => {
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(loginNext)}`);
      }, 2500);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, sp]);

  return (
    <div className="container-x py-16 text-center text-slate-400">
      {msg}
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="container-x py-16 text-center text-slate-400">
          Confirmation de votre email…
        </div>
      }
    >
      <AuthConfirmInner />
    </Suspense>
  );
}
