"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabaseBrowser";
import RfpOfferTypeBadge from "@/components/RfpOfferTypeBadge";
import { useTranslations } from "@/components/LocaleProvider";
import type { RfpResponseView } from "@/lib/rfp-responses";
import type { TypeOffre } from "@/lib/rfp-offer-type";

export default function RfpResponsesList({ rfpId }: { rfpId: string }) {
  const t = useTranslations();
  const [responses, setResponses] = useState<RfpResponseView[] | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(`/api/rfp/${rfpId}/responses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setResponses(data.responses ?? []);
      } catch {
        setResponses([]);
      }
    })();
  }, [rfpId]);

  if (responses === null) return null;
  if (responses.length === 0) return null;

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <div className="font-semibold text-slate-900">{t("rfp.responses.title")}</div>
      <p className="mt-1 text-xs text-slate-500">{t("rfp.responses.lead")}</p>
      <ul className="mt-4 space-y-3">
        {responses.map((r) => {
          const name = [r.responsable_prenom, r.responsable_nom].filter(Boolean).join(" ");
          const label = r.entreprise || name || t("rfp.responses.anonymous");
          const date = new Date(r.created_at).toLocaleDateString("fr-FR");
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{label}</div>
                {name && r.entreprise ? (
                  <div className="text-xs text-slate-500">{name}</div>
                ) : null}
                <div className="text-xs text-slate-400">{date}</div>
              </div>
              <RfpOfferTypeBadge
                typeOffre={r.type_offre as TypeOffre}
                dureeContratAns={r.duree_contrat_ans}
                light
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
