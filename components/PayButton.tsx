"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAccessToken } from "@/lib/supabaseBrowser";
import type { LeadTier } from "@/lib/types";

interface PayButtonProps {
  leadId: string;
  prix: number;
  tier?: LeadTier;
}

interface SubscriptionState {
  packRemaining: number | null;
  platformActive: boolean;
}

export default function PayButton({ leadId, prix, tier = "standard" }: PayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionState>({ packRemaining: null, platformActive: false });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setChecked(true);
        return;
      }
      try {
        const subRes = await fetch("/api/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subRes.ok) {
          const data = await subRes.json();
          setSub({
            packRemaining: data.active && data.remaining > 0 ? data.remaining : null,
            platformActive: !!data.platform?.active,
          });
        }
      } catch {
        /* ignore */
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  async function onSubscribe() {
    setLoading(true);
    setMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.push(`/login?next=/checkout/${leadId}`);
        return;
      }
      const res = await fetch("/api/platform-subscribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setMsg(data.error || "Impossible de démarrer l'abonnement.");
    } catch {
      setMsg("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

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
      if (res.status === 402 && data.requiresPlatform) {
        setMsg(data.error || "Abonnement Accès plateforme requis.");
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

  const usePackCredit = tier === "premium" && sub.packRemaining != null && sub.packRemaining > 0;
  const usePlatform = tier === "standard" && sub.platformActive;

  let label = `Payer ${prix} €`;
  if (usePlatform) {
    label = "Débloquer (inclus abonnement)";
  } else if (usePackCredit) {
    label = `Utiliser 1 crédit pack (${sub.packRemaining} restant${sub.packRemaining! > 1 ? "s" : ""})`;
  } else if (tier === "standard" && !sub.platformActive) {
    label = "S'abonner pour débloquer";
  }

  let hint = "Paiement sécurisé Stripe · Fiche débloquée immédiatement dans Mon espace.";
  if (usePlatform) {
    hint = "Lead inclus dans votre abonnement Accès plateforme.";
  } else if (usePackCredit) {
    hint = "Lead débloqué immédiatement · décompté de votre Pack Territoire.";
  } else if (tier === "standard" && !sub.platformActive) {
    hint = "Les leads standard sont accessibles via l'abonnement Accès plateforme.";
  }

  const handleClick =
    tier === "standard" && !sub.platformActive && checked ? onSubscribe : onPay;

  return (
    <div>
      <button onClick={handleClick} disabled={loading || !checked} className="btn-solar mt-6 w-full">
        {loading ? "Traitement…" : !checked ? "Chargement…" : label}
      </button>
      {tier === "standard" && !sub.platformActive && checked ? (
        <Link href="/#tarifs" className="mt-3 block text-center text-sm text-solar underline">
          Voir l&apos;abonnement Accès plateforme
        </Link>
      ) : null}
      {msg && <p className="mt-3 text-center text-sm text-red-300">{msg}</p>}
      <p className="mt-3 text-center text-xs text-slate-500">{hint}</p>
    </div>
  );
}
