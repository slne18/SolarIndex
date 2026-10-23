"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { nf, eurosCompact } from "@/lib/format";
import { displayRecouvrementSummary } from "@/lib/pv-overlap";
import type { PublicLead } from "@/lib/types";
import PayButton from "@/components/PayButton";
import RequireAuth from "@/components/RequireAuth";

function CheckoutContent({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [lead, setLead] = useState<PublicLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Lead introuvable.");
          return;
        }
        setLead(data.lead);
      } catch {
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId, router]);

  if (loading) {
    return <p className="container-x py-16 text-slate-400">Chargement…</p>;
  }

  if (error || !lead) {
    return (
      <div className="container-x py-16">
        <p className="text-red-300">{error || "Lead introuvable."}</p>
        <Link href="/leads" className="mt-4 inline-block text-sm text-solar underline">← Leads</Link>
      </div>
    );
  }

  const recouvrement = displayRecouvrementSummary(lead);

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-lg">
        <Link href={`/leads/${lead.id}`} className="text-sm text-slate-400 hover:text-white">
          ← Retour à la fiche
        </Link>

        <div className="card mt-4 p-7">
          <h1 className="text-2xl font-bold tracking-tight">Confirmation d&apos;achat</h1>
          <p className="mt-1 text-slate-400">
            Lead {lead.tier === "premium" ? "Premium" : "Standard"} — fiche de prospection B2B.
          </p>

          <div className="mt-6 space-y-2 rounded-xl border border-white/10 bg-night-700/40 p-4 text-sm">
            <Row k="Tier" v={lead.tier === "premium" ? "Premium" : "Standard"} />
            <Row k="Localisation" v={`${lead.ville || "—"} (${lead.departement})`} />
            <Row k="Surface" v={`${nf(lead.surface_m2)} m²`} />
            <Row k="Recouvrement" v={recouvrement.short} />
            <Row k="Puissance estimée" v={`${nf(lead.puissance_kwc)} kWc`} />
            <Row k="Valeur chantier" v={eurosCompact(lead.valeur_chantier_eur)} />
            <div className="my-2 border-t border-white/10" />
            <Row k="Prix du lead" v={`${lead.prix_lead} €`} strong />
          </div>

          <PayButton leadId={lead.id} prix={lead.prix_lead} tier={lead.tier} />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutClient({ leadId }: { leadId: string }) {
  return (
    <RequireAuth nextPath={`/checkout/${leadId}`}>
      <CheckoutContent leadId={leadId} />
    </RequireAuth>
  );
}

function Row({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{k}</span>
      <span className={strong ? "font-bold text-solar" : "font-medium text-white"}>{v}</span>
    </div>
  );
}
