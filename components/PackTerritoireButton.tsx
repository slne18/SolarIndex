"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { TERRITOIRE_PACK_EUR } from "@/lib/subscription";

export default function PackTerritoireButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onPurchase() {
    setLoading(true);
    setMsg(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/pack-territoire", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login?next=/pack-territoire");
        return;
      }
      if (res.status === 503) {
        setMsg("Paiement bientôt disponible (Stripe en cours de configuration).");
        return;
      }
      if (!res.ok || !data?.url) {
        setMsg(data?.error || "Impossible de démarrer le paiement.");
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setMsg("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onPurchase} disabled={loading} className="btn-solar w-full">
        {loading ? "Redirection Stripe…" : `Acheter le pack — ${TERRITOIRE_PACK_EUR} €`}
      </button>
      {msg && <p className="mt-3 text-center text-sm text-solar-400">{msg}</p>}
    </div>
  );
}
