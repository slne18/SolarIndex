"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabaseBrowser";

export default function SuccessFulfillment({ sessionId }: { sessionId?: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "ok" | "error">(
    sessionId ? "pending" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setStatus("error");
        setMessage("Connectez-vous pour finaliser la livraison de votre lead.");
        return;
      }

      try {
        const res = await fetch("/api/checkout/fulfill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "La livraison automatique a échoué.");
          return;
        }
        setStatus("ok");
      } catch {
        setStatus("error");
        setMessage("Erreur réseau lors de la livraison.");
      }
    })();
  }, [sessionId]);

  if (!sessionId || status === "idle" || status === "ok") return null;

  return (
    <p className={`mt-4 text-sm ${status === "error" ? "text-red-300" : "text-slate-400"}`}>
      {status === "pending"
        ? "Finalisation de votre achat…"
        : message}
    </p>
  );
}
