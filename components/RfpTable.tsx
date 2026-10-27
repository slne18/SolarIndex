"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePersona } from "@/components/PersonaProvider";
import { useTranslations } from "@/components/LocaleProvider";
import { RfpOfficialBadge, formatRfpDeadline } from "@/components/RfpCatalogExtras";
import SolutionTypeBadge from "@/components/SolutionTypeBadge";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { fmt } from "@/lib/i18n/format";
import { nf } from "@/lib/format";
import { showOwnerProjectDeposit } from "@/lib/persona";
import type { PublicRfp } from "@/lib/rfp";
import { resolveRfpSolutionType } from "@/lib/solution-type";

export default function RfpTable({
  rfps,
  ownedRfpIds = [],
}: {
  rfps: PublicRfp[];
  ownedRfpIds?: string[];
}) {
  const router = useRouter();
  const t = useTranslations();
  const { persona, ready } = usePersona();
  const isOwnerView = ready && persona === "owner";
  const showDepositCta = !ready || showOwnerProjectDeposit(persona);
  const owned = useMemo(() => new Set(ownedRfpIds), [ownedRfpIds]);
  const [platformActive, setPlatformActive] = useState(false);
  const [subChecked, setSubChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setSubChecked(true);
        return;
      }
      try {
        const res = await fetch("/api/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPlatformActive(!!data.platform?.active);
        }
      } catch {
        /* ignore */
      } finally {
        setSubChecked(true);
      }
    })();
  }, []);

  function openRfp(id: string) {
    router.push(`/appels-offres/${id}`);
  }

  function accessCell(r: PublicRfp) {
    if (owned.has(r.id)) {
      return (
        <span className="font-semibold text-emerald-600">{t("rfp.table.unlocked")}</span>
      );
    }

    const officialLink =
      r.ao_publie_officiellement && r.lien_consultation_officielle
        ? r.lien_consultation_officielle
        : null;

    if (r.ao_publie_officiellement && platformActive && subChecked) {
      return (
        <span className="flex flex-col gap-1">
          <span className="font-semibold text-solar">{t("rfp.table.unlockIncluded")}</span>
          {officialLink ? (
            <a
              href={officialLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-700 underline"
              onClick={(e) => e.stopPropagation()}
            >
              {t("rfp.table.officialDce")}
            </a>
          ) : null}
        </span>
      );
    }

    if (officialLink && !platformActive) {
      return (
        <span className="flex flex-col gap-1">
          <a
            href={officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {t("rfp.table.officialDce")}
          </a>
          {!subChecked ? (
            <span className="text-xs text-slate-500">{t("common.loading")}</span>
          ) : (
            <span className="text-xs text-slate-600">
              {fmt(t("rfp.table.unlockPrice"), { price: r.prix_acces })}
            </span>
          )}
        </span>
      );
    }

    if (!subChecked) {
      return <span className="text-slate-500">{t("common.loading")}</span>;
    }

    return (
      <span className="font-semibold text-solar">
        {fmt(t("rfp.table.unlockPrice"), { price: r.prix_acces })}
      </span>
    );
  }

  if (rfps.length === 0) {
    return (
      <p className="catalog-empty rounded-xl border p-8 text-center">
        Aucun appel d&apos;offres publié pour l&apos;instant.
        {showDepositCta ? (
          <>
            {" "}
            <Link href="/login?mode=signup&next=/appels-offres/nouveau" className="text-solar underline">
              Soumettre le vôtre
            </Link>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div className="catalog-table-wrap overflow-x-auto border">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="catalog-thead border-b text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">Projet</th>
            <th className="px-4 py-3">Localisation</th>
            <th className="px-4 py-3">Surface</th>
            <th className="px-4 py-3">Solution</th>
            <th className="px-4 py-3">Puissance</th>
            <th className="px-4 py-3">Date limite</th>
            {!isOwnerView ? <th className="px-4 py-3">Accès</th> : null}
          </tr>
        </thead>
        <tbody>
          {rfps.map((r) => (
            <tr
              key={r.id}
              className="catalog-row cursor-pointer border-b transition hover:bg-slate-50/80"
              onClick={() => openRfp(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openRfp(r.id);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`Ouvrir le projet publié le ${new Date(r.created_at).toLocaleDateString("fr-FR")}`}
            >
              <td className="px-4 py-3">
                <span className="table-cell-title font-medium">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Actif
                    </span>
                    <RfpOfficialBadge rfp={r} light />
                  </span>
                  <span className="mt-1 block text-slate-500">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    {r.parking_deja_etudie ? " · Déjà étudié" : ""}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {r.departement ? `Dép. ${r.departement}` : "—"}
                {r.region ? ` · ${r.region}` : ""}
              </td>
              <td className="px-4 py-3 text-slate-800">
                {r.surface_estimee_m2 ? `${nf(r.surface_estimee_m2)} m²` : "—"}
              </td>
              <td className="px-4 py-3">
                <SolutionTypeBadge type={resolveRfpSolutionType(r.type_solution_recherchee)} compact light />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {r.solar ? `${nf(r.solar.puissance_kwc)} kWc` : "—"}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {r.ao_publie_officiellement ? formatRfpDeadline(r.date_limite_offres) : r.delai_souhaite || "—"}
              </td>
              {!isOwnerView ? <td className="px-4 py-3">{accessCell(r)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
