"use client";

import { getAccessToken } from "@/lib/supabaseBrowser";

export default function RfpPurchaseButton({
  rfpId,
  prixAcces,
}: {
  rfpId: string;
  prixAcces: number;
}) {

  async function onClick() {
    const token = await getAccessToken();
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent(`/appels-offres/${rfpId}`)}`;
      return;
    }
    try {
      const res = await fetch("/api/rfp/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rfpId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`/appels-offres/${rfpId}`)}`;
        return;
      }
      if (!res.ok || !data.url) {
        alert(data.error || "Impossible de démarrer le paiement.");
        return;
      }
      window.location.href = data.url as string;
    } catch {
      alert("Erreur réseau.");
    }
  }

  return (
    <button onClick={onClick} className="btn-solar w-full">
      Débloquer les coordonnées — {prixAcces} €
    </button>
  );
}
