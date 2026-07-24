"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken, getBrowserClient } from "@/lib/supabaseBrowser";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account-constants";
import { nf } from "@/lib/format";
import { useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";

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
  acheteurs_max: number;
  can_withdraw: boolean;
};

export function MyRfpSubmissionsPanel({ variant = "installer" }: { variant?: "owner" | "installer" }) {
  const t = useTranslations();
  const [items, setItems] = useState<RfpMine[] | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isOwner = variant === "owner";

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
    if (!window.confirm(t("account.rfpWithdrawConfirm"))) {
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
        setMsg(data.error || t("account.rfpWithdrawError"));
        return;
      }
      setMsg(data.message);
      await load();
    } catch {
      setMsg(t("account.rfpNetworkError"));
    } finally {
      setWithdrawingId(null);
    }
  }

  if (items === null) {
    return isOwner ? <p className="mt-8 text-slate-400">{t("common.loading")}</p> : null;
  }

  if (!isOwner && items.length === 0) {
    return null;
  }

  return (
    <section className={`card ${isOwner ? "mt-8" : "mt-8"} p-5`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {isOwner ? t("account.myProjects") : t("account.myProjectDeposits")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isOwner ? t("account.myProjectsHint") : t("account.myProjectDepositsHint")}{" "}
            <Link href="/legal/cgu#retrait-annonce" className="text-solar underline">
              {t("account.rfpLegalLink")}
            </Link>
          </p>
        </div>
        {isOwner ? (
          <Link href="/appels-offres/nouveau" className="btn-solar !py-2 text-sm">
            {t("account.depositProject")}
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-white/15 p-8 text-center text-slate-400">
          <p>{t("account.noProjects")}</p>
          <Link href="/appels-offres/nouveau" className="btn-solar mt-4 inline-flex !py-2 text-sm">
            {t("account.depositProject")}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-white/10 bg-night-800/40 p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">{item.entreprise}</div>
                  <div className="mt-1 text-slate-400">
                    {item.adresse}
                    {item.departement ? ` · ${item.departement}` : ""}
                    {item.surface_estimee_m2
                      ? ` · ${nf(item.surface_estimee_m2)} m²`
                      : ""}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{item.statut_label}</div>
                  {item.statut === "publie" ? (
                    <p className="mt-2 text-sm font-medium text-emerald-300">
                      {item.acheteurs_count > 0
                        ? fmt(t("account.projectResponses"), {
                            count: item.acheteurs_count,
                            max: item.acheteurs_max,
                          })
                        : t("account.projectResponsesNone")}
                    </p>
                  ) : null}
                  {["en_attente_verification", "en_attente_moderation", "publie"].includes(item.statut) ? (
                    <Link
                      href={`/appels-offres/${item.id}/modifier`}
                      className="mt-2 mr-4 inline-block text-sm text-solar underline"
                    >
                      {t("account.editPublishedProject")}
                    </Link>
                  ) : null}
                  {item.statut === "publie" ? (
                    <Link
                      href={`/appels-offres/${item.id}`}
                      className="mt-3 inline-block text-sm text-solar underline"
                    >
                      {t("account.viewPublishedProject")}
                    </Link>
                  ) : null}
                </div>
                {item.can_withdraw ? (
                  <button
                    type="button"
                    disabled={withdrawingId === item.id}
                    onClick={() => withdraw(item.id)}
                    className="btn-ghost shrink-0 text-xs text-red-300 hover:text-red-200"
                  >
                    {withdrawingId === item.id
                      ? t("account.rfpWithdrawing")
                      : t("account.rfpWithdraw")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className="mt-3 text-sm text-solar-400">{msg}</p> : null}
    </section>
  );
}

export function DeleteAccountPanel() {
  const t = useTranslations();
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
        setMsg(data.error || t("account.deleteError"));
        return;
      }
      await getBrowserClient().auth.signOut();
      window.location.href = "/?compte=supprime";
    } catch {
      setMsg(t("account.rfpNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card mt-8 border-red-500/20 p-5">
      <h2 className="text-lg font-semibold text-white">{t("account.deleteTitle")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {t("account.deleteLead")}{" "}
        <Link href="/legal/cgu#retrait-annonce" className="text-solar underline">
          CGU §5.3
        </Link>{" "}
        ·{" "}
        <Link href="/legal/confidentialite" className="text-solar underline">
          {t("account.deletePrivacyLink")}
        </Link>
        .
      </p>
      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          {fmt(t("account.deleteConfirmLabel"), { phrase: ACCOUNT_DELETE_CONFIRMATION })}
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
        {loading ? t("account.deleting") : t("account.deleteSubmit")}
      </button>
      {msg ? <p className="mt-3 text-sm text-red-300">{msg}</p> : null}
    </section>
  );
}
