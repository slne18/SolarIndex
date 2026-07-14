"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserClient, getAccessToken } from "@/lib/supabaseBrowser";
import { euros, formatCoords, nf } from "@/lib/format";
import { displayRecouvrementSummary } from "@/lib/pv-overlap";
import type { LeadRow } from "@/lib/types";

import { MON_ESPACE_PATH } from "@/lib/paths";

type OwnedLead = LeadRow & { prix_lead: number };

interface SubscriptionQuota {
  active: boolean;
  remaining: number;
  quota: number;
  periodEnd: string | null;
}

export default function MonEspaceClient() {
  const [leads, setLeads] = useState<OwnedLead[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionQuota | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        window.location.href = `/login?next=${encodeURIComponent(MON_ESPACE_PATH)}`;
        return;
      }
      const { data: u } = await getBrowserClient().auth.getUser();
      setEmail(u.user?.email ?? null);

      const [leadsRes, subRes] = await Promise.all([
        fetch("/api/my-leads", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/subscription", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!leadsRes.ok) {
        setError("Impossible de charger vos leads.");
        setLeads([]);
      } else {
        const data = await leadsRes.json();
        setLeads(data.leads ?? []);
      }

      if (subRes.ok) {
        setSub(await subRes.json());
      }
    })();
  }, []);

  async function logout() {
    await getBrowserClient().auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="container-x py-10 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="pill-accent w-fit">Compte installateur</p>
          <h1 className="section-title mt-4">Mon espace personnel</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Vos leads achetés et vos crédits pack — tout ce dont vous avez besoin pour prospecter.
          </p>
          {email ? <p className="mt-2 text-sm text-slate-500">{email}</p> : null}
        </div>
        <button type="button" onClick={logout} className="btn-ghost shrink-0">
          Se déconnecter
        </button>
      </div>

      {sub?.active && (
        <div className="card mt-8 border-solar/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-solar">Pack Territoire</div>
              <p className="mt-1 text-sm text-slate-400">
                <strong className="text-white">{sub.remaining}</strong> / {sub.quota} crédits leads
                restants · Standard ou Premium au choix
              </p>
            </div>
            <Link href="/leads" className="btn-solar !py-2 text-sm">
              Choisir un lead
            </Link>
          </div>
        </div>
      )}

      {!sub?.active && (
        <div className="card mt-8 p-5 text-sm text-slate-400">
          Pas de crédits pack actifs.{" "}
          <Link href="/pack-territoire" className="text-solar underline">
            Pack Territoire — 5 leads
          </Link>
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Mes leads achetés</h2>
          <p className="mt-1 text-sm text-slate-500">
            Coordonnées complètes · SIREN, dirigeants, adresse, parcelle
          </p>
        </div>
        <Link href="/leads" className="btn-ghost !py-2 text-sm">
          Acheter un lead
        </Link>
      </div>

      {leads === null && <p className="mt-4 text-slate-400">Chargement…</p>}
      {error && <p className="mt-4 text-red-300">{error}</p>}

      {leads && leads.length === 0 && (
        <div className="card mt-4 p-8 text-center text-slate-400">
          <p>Aucun lead acheté pour l&apos;instant.</p>
          <Link href="/leads" className="btn-solar mt-4 inline-flex !py-2 text-sm">
            Parcourir le catalogue
          </Link>
        </div>
      )}

      {leads && leads.length > 0 && (
        <div className="mt-4 space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{l.raison_sociale || l.nom_osm || "Parking"}</div>
                  {l.nom_osm && l.raison_sociale && l.nom_osm !== l.raison_sociale ? (
                    <div className="text-xs text-slate-500">Site : {l.nom_osm}</div>
                  ) : null}
                  <div className="text-sm text-slate-400">
                    {l.ville || "—"} ({l.departement}) · {nf(l.surface_m2)} m² · {nf(l.puissance_kwc)} kWc
                    {" · "}
                    Recouvrement {displayRecouvrementSummary(l).short}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  <div className="text-right">
                    <div className="font-semibold text-solar">{euros(l.valeur_chantier_eur)}</div>
                    <div className="text-slate-500">chantier estimé</div>
                  </div>
                  <Link href={`/leads/${l.id}?from=mon-espace`} className="btn-ghost !px-3 !py-1.5 text-xs">
                    Voir la fiche complète
                  </Link>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Info k="Exploitant" v={l.raison_sociale} />
                <Info k="SIREN" v={l.siren} />
                <Info
                  k="Dirigeant exploitant"
                  v={formatDirigeant(l.dirigeant_exploitant ?? l.dirigeant_nom, l.dirigeant_exploitant_qualite)}
                />
                <Info k="Propriétaire foncier" v={l.proprietaire_foncier} />
                <Info
                  k="Dirigeant propriétaire"
                  v={formatDirigeant(l.dirigeant_proprietaire, l.dirigeant_proprietaire_qualite)}
                />
                <Info k="Adresse" v={l.adresse} wide />
                <Info k="Parcelle" v={l.id_parcelle} />
                <Info k="Coordonnées GPS" v={formatCoords(l.latitude, l.longitude)} wide />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({
  k,
  v,
  wide = false,
}: {
  k: string;
  v: string | null;
  wide?: boolean;
}) {
  return (
    <div className={`flex justify-between border-b border-white/5 py-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-slate-400">{k}</span>
      <span className="font-medium text-slate-100">{v || "—"}</span>
    </div>
  );
}

function formatDirigeant(name: string | null, qualite: string | null): string | null {
  if (!name) return null;
  if (qualite) return `${name} · ${qualite}`;
  return name;
}
