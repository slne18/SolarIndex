"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { catalogAuthHeaders } from "@/lib/preview-catalog";
import { nf } from "@/lib/format";
import type { OwnedRfp, PublicRfp } from "@/lib/rfp";
import RfpLegalNotice from "@/components/RfpLegalNotice";
import RfpPurchaseButton from "@/components/RfpPurchaseButton";

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

  const owned = isOwned && "entreprise" in rfp;

  return (
    <div className="surface-light min-h-[50vh]">
    <div className="container-x py-10">
      <Link href="/appels-offres" className="back-link text-sm">← Appels d&apos;offres</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            Projet actif
          </span>
          <h1 className="mt-4 text-2xl font-bold">Projet parking — consultation installateurs</h1>
          <p className="mt-2 text-slate-600">
            Publié le {new Date(rfp.created_at).toLocaleDateString("fr-FR")}
            {rfp.departement ? ` · Dép. ${rfp.departement}` : ""}
            {rfp.region ? ` · ${rfp.region}` : ""}
          </p>

          <dl className="mt-6 space-y-2 text-sm">
            <Row k="Surface estimée" v={rfp.surface_estimee_m2 ? `${nf(rfp.surface_estimee_m2)} m²` : "—"} />
            <Row k="Déjà équipé partiellement" v={rfp.deja_equipe_partiel ? "Oui" : "Non"} />
            <Row k="Dérogation pente possible" v={rfp.derogation_pente ? "Oui" : "Non"} />
            <Row k="Zone ABF possible" v={rfp.derogation_abf ? "Oui" : "Non"} />
            <Row k="Budget indicatif" v={rfp.budget_indicatif || "—"} />
            <Row k="Délai souhaité" v={rfp.delai_souhaite || "—"} />
          </dl>

          {owned ? (
            <div className="card mt-6 p-5 text-sm">
              <div className="font-semibold text-white">Coordonnées débloquées</div>
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
            <div className="text-sm text-slate-400">Accès installateur</div>
            <div className="mt-1 text-3xl font-bold text-solar">{rfp.prix_acces} €</div>
            <p className="mt-2 text-sm text-slate-400">
              Coordonnées fournies volontairement par le déposant (mise en relation commerciale, hors
              marché public).
              {rfp.acheteurs_count > 0
                ? ` ${rfp.acheteurs_count} installateur${rfp.acheteurs_count > 1 ? "s ont" : " a"} déjà débloqué l'accès.`
                : null}
            </p>
            <div className="mt-4">
              <RfpLegalNotice variant="installer" />
            </div>
            {owned ? (
              <p className="mt-4 text-sm text-emerald-300">Vous avez débloqué ce projet.</p>
            ) : (
              <div className="mt-4">
                <RfpPurchaseButton rfpId={rfp.id} prixAcces={rfp.prix_acces} />
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
