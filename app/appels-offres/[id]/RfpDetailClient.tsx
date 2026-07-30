"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { resolveRfpSolutionType, solutionTypeLabelKey } from "@/lib/solution-type";
import { useTranslations } from "@/components/LocaleProvider";

function Masked({ label, light }: { label: string; light?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-2.5 text-sm last:border-0">
      <span className={light ? "text-slate-600" : "text-slate-400"}>{label}</span>
      <span
        className={
          light
            ? "select-none rounded bg-slate-200 px-8 py-0.5 text-xs font-medium text-slate-400"
            : "select-none rounded bg-white/10 px-8 py-0.5 text-transparent blur-[3px]"
        }
      >
        {light ? "••••••" : "MASQUÉ"}
      </span>
    </div>
  );
}

export default function RfpDetailClient({ id }: { id: string }) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const fromMonEspace = searchParams.get("from") === "mon-espace";
  const [rfp, setRfp] = useState<(PublicRfp | OwnedRfp) | null>(null);
  const [isOwned, setIsOwned] = useState(false);
  const [isDeposant, setIsDeposant] = useState(false);
  const [canPurchase, setCanPurchase] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      setAuthed(!!token);
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
        setCanEdit(!!data.can_edit);
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
  const backHref = isDeposant || fromMonEspace ? MON_ESPACE_PATH : "/appels-offres";
  const backLabel = isDeposant || fromMonEspace ? "← Mon espace" : "← Appels d'offres";
  const solutionType = resolveRfpSolutionType(rfp.type_solution_recherchee);

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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SolutionTypeBadge type={solutionType} showAudience light />
          </div>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {t("rfp.detail.solutionSought")} : {t(solutionTypeLabelKey(solutionType))}
          </p>
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
            <RfpSolarMetricsCard rfp={rfp} />
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <Row k={t("rfp.detail.solutionSought")} v={t(solutionTypeLabelKey(solutionType))} />
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
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
              <div className="font-semibold text-slate-900">
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
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm">
              <div className="font-semibold text-slate-800">{t("rfp.detail.contactsMasked")}</div>
              <p className="mt-1 text-xs text-slate-500">
                Débloquées après achat de l&apos;accès installateur.
              </p>
              <div className="mt-3 space-y-1">
                <Masked label="Entreprise" light />
                <Masked label="Contact" light />
                <Masked label="Email / téléphone" light />
                <Masked label="Adresse exacte" light />
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
                {canEdit ? (
                  <Link
                    href={`/appels-offres/${rfp.id}/modifier`}
                    className="btn-solar mt-3 inline-flex w-full justify-center !py-2 text-sm"
                  >
                    Corriger les informations
                  </Link>
                ) : null}
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
                    {!authed ? (
                      <>
                        {t("rfp.detail.signInToPurchase")}{" "}
                        <Link
                          href={`/login?mode=signup&next=${encodeURIComponent(`/appels-offres/${rfp.id}`)}`}
                          className="text-solar-700 underline"
                        >
                          {t("rfp.detail.createSpaceLink")}
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        {t("rfp.detail.purchaseOwnerOnly")}{" "}
                        <Link href={MON_ESPACE_PATH} className="text-solar-700 underline">
                          Mon espace
                        </Link>
                        .
                      </>
                    )}
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
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-slate-500">{k}</dt>
      <dd className={solar ? "font-medium text-solar-700" : "text-right font-medium text-slate-800"}>{v}</dd>
    </div>
  );
}
