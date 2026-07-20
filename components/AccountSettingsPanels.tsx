"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken, getBrowserClient } from "@/lib/supabaseBrowser";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account-constants";

type RfpMine = {
  id: string;
  created_at: string;
  statut: string;
  statut_label: string;
  entreprise: string;
  adresse: string;
  departement: string | null;
  surface_estimee_m2: number | null;
  acheteurs_count: number;
  can_withdraw: boolean;
};

export function MyRfpSubmissionsPanel() {
  const [items, setItems] = useState<RfpMine[] | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch("/api/rfp/mine", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setItems(data.submissions ?? []);
    } else {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw(id: string) {
    if (
      !window.confirm(
        "Retirer cette annonce du catalogue ? Les installateurs ayant déjà payé l'accès conserveront vos coordonnées.",
      )
    ) {
      return;
    }
    setWithdrawingId(id);
    setMsg(null);
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/rfp/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Impossible de retirer l'annonce.");
        return;
      }
      setMsg(data.message);
      await load();
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setWithdrawingId(null);
    }
  }

  if (items === null) return null;
  if (items.length === 0) return null;

  return (
    <section className="card mt-8 p-5">
      <h2 className="text-lg font-semibold text-white">Mes dépôts de projet</h2>
      <p className="mt-1 text-sm text-slate-400">
        Retirez une annonce à tout moment.{" "}
        <Link href="/legal/cgu#retrait-annonce" className="text-solar underline">
          Modalités (CGU §5)
        </Link>
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-white/10 bg-night-800/40 p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium text-white">{item.entreprise}</div>
                <div className="mt-1 text-slate-400">
                  {item.adresse}
                  {item.departement ? ` · ${item.departement}` : ""}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {item.statut_label}
                  {item.statut === "publie" && item.acheteurs_count > 0
                    ? ` · ${item.acheteurs_count} accès installateur(s)`
                    : ""}
                </div>
              </div>
              {item.can_withdraw ? (
                <button
                  type="button"
                  disabled={withdrawingId === item.id}
                  onClick={() => withdraw(item.id)}
                  className="btn-ghost shrink-0 text-xs text-red-300 hover:text-red-200"
                >
                  {withdrawingId === item.id ? "Retrait…" : "Retirer l'annonce"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {msg ? <p className="mt-3 text-sm text-solar-400">{msg}</p> : null}
    </section>
  );
}

export function DeleteAccountPanel() {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onDelete() {
    setLoading(true);
    setMsg(null);
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Échec de la suppression.");
        return;
      }
      await getBrowserClient().auth.signOut();
      window.location.href = "/?compte=supprime";
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card mt-8 border-red-500/20 p-5">
      <h2 className="text-lg font-semibold text-white">Supprimer mon compte</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Action définitive : vos annonces actives seront retirées, vos coordonnées sur les dépôts passés
        anonymisées, et votre compte supprimé. Les achats déjà effectués (leads, accès appels
        d&apos;offres) restent archivés côté comptabilité sans lien avec votre identité. Voir{" "}
        <Link href="/legal/cgu#retrait-annonce" className="text-solar underline">
          CGU §5.3
        </Link>{" "}
        et la{" "}
        <Link href="/legal/confidentialite" className="text-solar underline">
          Politique de confidentialité
        </Link>
        .
      </p>
      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Saisissez « {ACCOUNT_DELETE_CONFIRMATION} » pour confirmer
        </span>
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="input w-full max-w-md"
          autoComplete="off"
        />
      </label>
      <button
        type="button"
        disabled={loading || confirmation !== ACCOUNT_DELETE_CONFIRMATION}
        onClick={onDelete}
        className="btn-ghost mt-4 border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
      >
        {loading ? "Suppression…" : "Supprimer définitivement mon compte"}
      </button>
      {msg ? <p className="mt-3 text-sm text-red-300">{msg}</p> : null}
    </section>
  );
}
