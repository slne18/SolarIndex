"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabaseBrowser";

export default function RequireAuth({
  children,
  nextPath,
}: {
  children: React.ReactNode;
  nextPath?: string;
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
      setReady(true);
    })();
  }, [nextPath]);

  if (!ready) {
    return (
      <div className="container-x py-16 text-center text-slate-400">
        Chargement de votre espace…
      </div>
    );
  }

  return <>{children}</>;
}
