"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { useTranslations } from "@/components/LocaleProvider";
import type { TypeOffre } from "@/lib/rfp-offer-type";

export default function RfpPurchaseButton({
  rfpId,
  prixAcces,
}: {
  rfpId: string;
  prixAcces: number;
}) {
  const t = useTranslations();
  const [typeOffre, setTypeOffre] = useState<TypeOffre>("devis_installation");
  const [dureeContratAns, setDureeContratAns] = useState("15");
  const [loading, setLoading] = useState(false);

  async function onClick() {
    const token = await getAccessToken();
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent(`/appels-offres/${rfpId}`)}`;
      return;
    }

    if (typeOffre === "tiers_investissement") {
      const duree = Number(dureeContratAns);
      if (!Number.isFinite(duree) || duree < 1 || duree > 40) {
        alert(t("rfp.purchase.invalidDuration"));
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/rfp/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rfpId,
          type_offre: typeOffre,
          duree_contrat_ans:
            typeOffre === "tiers_investissement" ? Number(dureeContratAns) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`/appels-offres/${rfpId}`)}`;
        return;
      }
      if (!res.ok || !data.url) {
        alert(data.error || t("rfp.purchase.checkoutError"));
        return;
      }
      window.location.href = data.url as string;
    } catch {
      alert(t("rfp.purchase.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("rfp.purchase.offerTypeLegend")}
        </legend>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
          <input
            type="radio"
            name="type_offre"
            className="mt-1 accent-solar"
            checked={typeOffre === "devis_installation"}
            onChange={() => setTypeOffre("devis_installation")}
          />
          <span>
            <span className="font-medium text-slate-900">{t("rfp.offerType.devis_installation.label")}</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {t("rfp.offerType.devis_installation.hint")}
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
          <input
            type="radio"
            name="type_offre"
            className="mt-1 accent-solar"
            checked={typeOffre === "tiers_investissement"}
            onChange={() => setTypeOffre("tiers_investissement")}
          />
          <span>
            <span className="font-medium text-slate-900">{t("rfp.offerType.tiers_investissement.label")}</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {t("rfp.offerType.tiers_investissement.hint")}
            </span>
          </span>
        </label>
      </fieldset>

      {typeOffre === "tiers_investissement" ? (
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            {t("rfp.purchase.contractDuration")}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={40}
              required
              value={dureeContratAns}
              onChange={(e) => setDureeContratAns(e.target.value)}
              className="input w-24"
            />
            <span className="text-slate-600">{t("rfp.purchase.years")}</span>
          </div>
        </label>
      ) : null}

      <button type="button" onClick={onClick} disabled={loading} className="btn-solar w-full">
        {loading ? t("rfp.purchase.loading") : t("rfp.purchase.unlock").replace("{price}", String(prixAcces))}
      </button>
    </div>
  );
}
