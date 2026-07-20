"use client";

import Link from "next/link";
import { usePersona } from "@/components/PersonaProvider";
import { RfpOfficialBadge, formatRfpDeadline } from "@/components/RfpCatalogExtras";
import { nf } from "@/lib/format";
import { showOwnerProjectDeposit } from "@/lib/persona";
import type { PublicRfp } from "@/lib/rfp";

export default function RfpTable({ rfps }: { rfps: PublicRfp[] }) {
  const { persona, ready } = usePersona();
  const isOwnerView = ready && persona === "owner";
  const showDepositCta = !ready || showOwnerProjectDeposit(persona);

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
            <th className="px-4 py-3">Puissance</th>
            <th className="px-4 py-3">Date limite</th>
            {!isOwnerView ? <th className="px-4 py-3">Accès</th> : null}
          </tr>
        </thead>
        <tbody>
          {rfps.map((r) => (
            <tr key={r.id} className="catalog-row border-b">
              <td className="px-4 py-3">
                <Link href={`/appels-offres/${r.id}`} className="table-cell-title font-medium hover:text-solar">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      Actif
                    </span>
                    <RfpOfficialBadge rfp={r} light />
                  </span>
                  <span className="mt-1 block text-slate-400">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    {r.parking_deja_etudie ? " · Déjà étudié" : ""}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-300">
                {r.departement ? `Dép. ${r.departement}` : "—"}
                {r.region ? ` · ${r.region}` : ""}
              </td>
              <td className="px-4 py-3">{r.surface_estimee_m2 ? `${nf(r.surface_estimee_m2)} m²` : "—"}</td>
              <td className="px-4 py-3 text-slate-300">
                {r.solar ? `${nf(r.solar.puissance_kwc)} kWc` : "—"}
              </td>
              <td className="px-4 py-3 text-slate-400">
                {r.ao_publie_officiellement ? formatRfpDeadline(r.date_limite_offres) : r.delai_souhaite || "—"}
              </td>
              {!isOwnerView ? (
                <td className="px-4 py-3">
                  {r.ao_publie_officiellement && r.lien_consultation_officielle ? (
                    <a
                      href={r.lien_consultation_officielle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-300 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      DCE officiel ↗
                    </a>
                  ) : (
                    <span className="font-semibold text-solar">{r.prix_acces} €</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
