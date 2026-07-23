"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { catalogAuthHeaders } from "@/lib/preview-catalog";
import { nf } from "@/lib/format";
import type { OwnedRfp, PublicRfp } from "@/lib/rfp";
import { MON_ESPACE_PATH } from "@/lib/paths";
import RfpLegalNotice from "@/components/RfpLegalNotice";
import RfpPurchaseButton from "@/components/RfpPurchaseButton";
import {
  RfpOfficialBadge,
  RfpOfficialLinkButton,
  RfpSolarMetricsCard,
  formatRfpDeadline,
} from "@/components/RfpCatalogExtras";
import SolutionTypeBadge from "@/components/SolutionTypeBadge";
import { resolveRfpSolutionType } from "@/lib/solution-type";

function Masked({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="select-none rounded bg-white/10 px-8 py-0.5 text-transparent blur-[3px]">MASQUÉ</span>
    </div>
  );
}

export default function RfpDetailClient({ id }: { id: string }) {
  const [rfp, setRfp] = useState<(PublicRfp | OwnedRfp) | null>(null);
  const [isOwned, setIsOwned] = useState(false);
  const [isDeposant, setIsDeposant] = useState(false);
  const [canPurchase, setCanPurchase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      try {
        const res = await fetch(`/api/rfp/${id}`, { headers: catalogAuthHeaders(token) });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Introuvable.");
          return;
        }
        setRfp(data.rfp);
        setIsOwned(!!data.is_owned);
        setIsDeposant(!!data.is_deposant);
        setCanPurchase(!!data.can_purchase);
      } catch {
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="surface-light">
        <p className="container-x py-10 text-slate-600">Chargement…</p>
      </div>
    );
  }
  if (error || !rfp) {
    return (
      <div className="surface-light">
        <div className="container-x py-10">
          <p className="text-red-600">{error || "Introuvable."}</p>
          <Link href="/appels-offres" className="back-link mt-4 inline-block underline">← Retour</Link>
        </div>
      </div>
    );
  }

  const showContacts = (isOwned || isDeposant) && "entreprise" in rfp;
  const officialUrl = rfp.ao_publie_officiellement ? rfp.lien_consultation_officielle : null;
  const backHref = isDeposant ? MON_ESPACE_PATH : "/appels-offres";
  const backLabel = isDeposant ? "← Mon espace" : "← Appels d'offres";

  return (
    <div className="surface-light min-h-[50vh]">
    <div className="container-x py-10">
      <Link href={backHref} className="back-link text-sm">{backLabel}</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {isDeposant ? (
              <span className="rounded-full bg-solar/15 px-3 py-1 text-xs font-semibold text-solar-700">
                Votre projet
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
                Projet actif
              </span>
            )}
            <RfpOfficialBadge rfp={rfp} light />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Projet parking — consultation installateurs</h1>
          <p className="mt-2 text-slate-600">
            Publié le {new Date(rfp.created_at).toLocaleDateString("fr-FR")}
            {rfp.departement ? ` · Dép. ${rfp.departement}` : ""}
            {rfp.region ? ` · ${rfp.region}` : ""}
          </p>

          {officialUrl ? (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">Appel d&apos;offres officiel publié</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Date limite : <strong>{formatRfpDeadline(rfp.date_limite_offres)}</strong>
                    {rfp.lien_plateforme_connue ? " · Plateforme reconnue" : " · URL fournie par le déposant"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    SolarIndex référence ce lien public. Le DCE reste sur la plateforme officielle — nous
                    n&apos;hébergeons ni ne reproduisons les documents de consultation.
                  </p>
                </div>
                <RfpOfficialLinkButton href={officialUrl} className="btn-mint shrink-0" />
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <SolutionTypeBadge
              type={resolveRfpSolutionType(rfp.type_solution_recherchee)}
              showAudience
              light
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Installateurs solaires et paysagistes peuvent répondre au même appel d&apos;offres,
              éventuellement en consortium.
            </p>
          </div>

          <div className="mt-6">
            <RfpSolarMetricsCard rfp={rfp} />
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <Row k="Surface estimée" v={rfp.surface_estimee_m2 ? `${nf(rfp.surface_estimee_m2)} m²` : "—"} />
            <Row k="Parking déjà étudié" v={rfp.parking_deja_etudie ? "Oui" : "Non"} />
            <Row k="Déjà équipé partiellement" v={rfp.deja_equipe_partiel ? "Oui" : "Non"} />
            <Row k="Dérogation pente possible" v={rfp.derogation_pente ? "Oui" : "Non"} />
            <Row k="Zone ABF possible" v={rfp.derogation_abf ? "Oui" : "Non"} />
            <Row k="Budget indicatif" v={rfp.budget_indicatif || "—"} />
            <Row k="Délai souhaité" v={rfp.delai_souhaite || "—"} />
          </dl>

          {rfp.documents_complementaires.length > 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-800">Documents complémentaires</div>
              <ul className="mt-2 space-y-1">
                {rfp.documents_complementaires.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-solar-700 underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showContacts ? (
            <div className="card mt-6 p-5 text-sm">
              <div className="font-semibold text-white">
                {isDeposant ? "Vos coordonnées de contact" : "Coordonnées débloquées"}
              </div>
              {isDeposant ? (
                <p className="mt-1 text-xs text-slate-400">
                  Visibles pour vous sans achat — transmises aux installateurs qui débloquent l&apos;accès.
                </p>
              ) : null}
              <dl className="mt-3 space-y-2">
                <Row k="Entreprise" v={(rfp as OwnedRfp).entreprise} />
                <Row k="Contact" v={(rfp as OwnedRfp).contact_nom} />
                <Row k="Fonction" v={(rfp as OwnedRfp).contact_fonction || "—"} />
                <Row k="Email" v={(rfp as OwnedRfp).contact_email} solar />
                <Row k="Téléphone" v={(rfp as OwnedRfp).contact_telephone} solar />
                <Row k="Adresse" v={(rfp as OwnedRfp).adresse} />
              </dl>
            </div>
          ) : (
            <div className="card mt-6 p-5 text-sm">
              <div className="font-semibold text-white">Coordonnées masquées</div>
              <div className="mt-3 space-y-1">
                <Masked label="Entreprise" />
                <Masked label="Contact" />
                <Masked label="Email / téléphone" />
                <Masked label="Adresse exacte" />
              </div>
            </div>
          )}
        </div>

        <aside>
          <div className="card p-6">
            {officialUrl ? (
              <>
                <div className="text-sm text-slate-400">Accès DCE officiel</div>
                <p className="mt-2 text-sm text-slate-300">
                  Gratuit — redirection vers la plateforme de marchés publics indiquée par le déposant.
                </p>
                <div className="mt-4">
                  <RfpOfficialLinkButton href={officialUrl} className="btn-mint w-full" />
                </div>
              </>
            ) : null}

            {isDeposant ? (
              <div className={officialUrl ? "mt-6 border-t border-white/10 pt-6" : ""}>
                <div className="text-sm font-semibold text-white">Suivi de votre dépôt</div>
                <p className="mt-2 text-sm text-slate-400">
                  {rfp.acheteurs_count > 0
                    ? `${rfp.acheteurs_count} installateur${rfp.acheteurs_count > 1 ? "s ont" : " a"} déjà demandé vos coordonnées (max. ${rfp.acheteurs_max}).`
                    : "Aucun installateur n'a encore débloqué l'accès."}
                </p>
                <Link href={MON_ESPACE_PATH} className="btn-ghost mt-4 inline-flex w-full justify-center !py-2 text-sm">
                  Gérer depuis Mon espace
                </Link>
              </div>
            ) : (
              <div className={officialUrl ? "mt-6 border-t border-white/10 pt-6" : ""}>
                <div className="text-sm text-slate-400">Accès installateur — contact direct</div>
                <div className="mt-1 text-3xl font-bold text-solar">{rfp.prix_acces} €</div>
                <p className="mt-2 text-sm text-slate-400">
                  Coordonnées fournies volontairement par le déposant (mise en relation commerciale privée).
                  {rfp.acheteurs_count > 0
                    ? ` ${rfp.acheteurs_count} installateur${rfp.acheteurs_count > 1 ? "s ont" : " a"} déjà débloqué l'accès.`
                    : null}
                </p>
                <div className="mt-4">
                  <RfpLegalNotice variant="installer" />
                </div>
                {isOwned ? (
                  <p className="mt-4 text-sm text-emerald-300">Vous avez débloqué ce projet.</p>
                ) : canPurchase ? (
                  <div className="mt-4">
                    <RfpPurchaseButton rfpId={rfp.id} prixAcces={rfp.prix_acces} />
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    L&apos;achat d&apos;accès est réservé aux installateurs. En tant que propriétaire ou gérant,
                    déposez votre projet depuis{" "}
                    <Link href={MON_ESPACE_PATH} className="text-solar-700 underline">
                      Mon espace
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
    </div>
  );
}

function Row({ k, v, solar = false }: { k: string; v: string; solar?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{k}</dt>
      <dd className={solar ? "font-medium text-solar" : "detail-value text-right font-medium"}>{v}</dd>
    </div>
  );
}
