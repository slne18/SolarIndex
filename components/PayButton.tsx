"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";

interface PayButtonProps {
  leadId: string;
  prix: number;
  sampleRemaining?: number;
}

export default function PayButton({
  leadId,
  prix,
  sampleRemaining = 0,
}: PayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [subRemaining, setSubRemaining] = useState<number | null>(null);
  const [sampleLeft, setSampleLeft] = useState(sampleRemaining);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setSampleLeft(sampleRemaining);
  }, [sampleRemaining]);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setChecked(true);
        return;
      }
      try {
        const [subRes, sampleRes] = await Promise.all([
          fetch("/api/subscription", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/sample", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (subRes.ok) {
          const data = await subRes.json();
          if (data.active && data.remaining > 0) {
            setSubRemaining(data.remaining);
          }
        }
        if (sampleRes.ok) {
          const data = await sampleRes.json();
          setSampleLeft(data.remaining ?? 0);
        }
      } catch {
        /* ignore */
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  async function onPay() {
    setLoading(true);
    setMsg(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/login?next=/checkout/${leadId}`);
        return;
      }
      if (res.status === 403 && data.error?.includes("département")) {
        setMsg(data.error);
        return;
      }
      if (res.status === 503) {
        setMsg("Paiement en ligne bientôt disponible.");
        return;
      }
      if (res.status === 409) {
        setMsg(data?.error || "Ce lead n'est plus disponible.");
        return;
      }
      if (!res.ok) {
        setMsg(data?.error || "Impossible de finaliser l'achat.");
        return;
      }
      if (data.redeemed && data.url) {
        window.location.href = data.url as string;
        return;
      }
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      setMsg("Réponse inattendue du serveur.");
    } catch {
      setMsg("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const useSample = sampleLeft > 0;
  const useCredit = !useSample && subRemaining != null && subRemaining > 0;

  let label = `Payer ${prix} €`;
  if (useSample) {
    label = `Utiliser 1 crédit échantillon (${sampleLeft} restant${sampleLeft > 1 ? "s" : ""})`;
  } else if (useCredit) {
    label = `Utiliser 1 crédit pack (${subRemaining} restant${subRemaining! > 1 ? "s" : ""})`;
  }

  return (
    <div>
      <button onClick={onPay} disabled={loading || !checked} className="btn-solar mt-6 w-full">
        {loading ? "Traitement…" : !checked ? "Chargement…" : label}
      </button>
      {msg && <p className="mt-3 text-center text-sm text-red-300">{msg}</p>}
      <p className="mt-3 text-center text-xs text-slate-500">
        {useSample
          ? "Lead débloqué immédiatement · décompté de votre échantillon gratuit."
          : useCredit
            ? "Lead débloqué immédiatement · décompté de votre Pack Territoire."
            : "Paiement sécurisé Stripe · Livraison instantanée par email."}
      </p>
    </div>
  );
}
