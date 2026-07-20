"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { ensureProfileComplete } from "@/lib/ensure-profile-complete";

export default function RequireAuth({
  children,
  nextPath,
  requireProfile = true,
}: {
  children: React.ReactNode;
  nextPath?: string;
  requireProfile?: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      const next =
        nextPath ??
        (typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/leads");
      if (!token) {
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
        return;
      }

      if (requireProfile) {
        if (!(await ensureProfileComplete(next, token))) return;
      }

      setReady(true);
    })();
  }, [nextPath, requireProfile]);

  if (!ready) {
    return (
      <div className="container-x py-16 text-center text-slate-400">
        Chargement de votre espace…
      </div>
    );
  }

  return <>{children}</>;
}
