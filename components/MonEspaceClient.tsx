"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserClient, getAccessToken } from "@/lib/supabaseBrowser";
import { ensureProfileComplete } from "@/lib/ensure-profile-complete";
import { euros, formatCoords, nf } from "@/lib/format";
import { displayRecouvrementSummary } from "@/lib/pv-overlap";
import { canDepositProject, type UserType } from "@/lib/profile-onboarding";
import type { LeadRow } from "@/lib/types";
import type { OwnedRfp } from "@/lib/rfp";
import SolutionTypeBadge from "@/components/SolutionTypeBadge";
import { resolveRfpSolutionType } from "@/lib/solution-type";

import { MON_ESPACE_PATH } from "@/lib/paths";
import { DeleteAccountPanel, MyRfpSubmissionsPanel } from "@/components/AccountSettingsPanels";
import { useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";

type OwnedLead = LeadRow & { prix_lead: number };

type PurchasedRfp = OwnedRfp & {
  purchased_at: string;
  montant_eur: number;
  listing_statut: string;
};

interface SubscriptionQuota {
  active: boolean;
  remaining: number;
  quota: number;
  periodEnd: string | null;
  platform?: {
    active: boolean;
    periodEnd: string | null;
  };
}

export default function MonEspaceClient() {
  const t = useTranslations();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [leads, setLeads] = useState<OwnedLead[] | null>(null);
  const [rfps, setRfps] = useState<PurchasedRfp[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionQuota | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = userType != null && canDepositProject(userType);
  const isInstaller = userType === "installateur";

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        window.location.href = `/login?next=${encodeURIComponent(MON_ESPACE_PATH)}`;
        return;
      }
      if (!(await ensureProfileComplete(MON_ESPACE_PATH, token))) return;
      const { data: u } = await getBrowserClient().auth.getUser();
      setEmail(u.user?.email ?? null);

      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      let type: UserType | undefined;
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        type = profileData.profile?.user_type;
        setUserType(type ?? null);
      }

      if (type === "installateur") {
        const [leadsRes, rfpsRes, subRes] = await Promise.all([
          fetch("/api/my-leads", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/my-rfps", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/subscription", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!leadsRes.ok) {
          setError(t("account.loadError"));
          setLeads([]);
        } else {
          const data = await leadsRes.json();
          setLeads(data.leads ?? []);
        }

        if (rfpsRes.ok) {
          const rfpData = await rfpsRes.json();
          setRfps(rfpData.rfps ?? []);
        } else {
          setRfps([]);
        }

        if (subRes.ok) {
          setSub(await subRes.json());
        }
      } else {
        setLeads([]);
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
          <p className="pill-accent w-fit">{t("account.pill")}</p>
          <h1 className="section-title mt-4">{t("account.title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            {isOwner ? t("account.leadOwner") : t("account.lead")}
          </p>
          {email ? <p className="mt-2 text-sm text-slate-500">{email}</p> : null}
        </div>
        <button type="button" onClick={logout} className="btn-ghost shrink-0">
          {t("account.logout")}
        </button>
      </div>

      {userType === null ? (
        <p className="mt-8 text-slate-400">{t("common.loading")}</p>
      ) : null}

      {isOwner ? (
        <MyRfpSubmissionsPanel variant="owner" />
      ) : null}

      {isInstaller ? (
        <>
          {sub?.platform?.active ? (
            <div className="card mt-8 border-solar/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-solar">{t("account.platformTitle")}</div>
                  <p className="mt-1 text-sm text-slate-400">{t("account.platformLead")}</p>
                  {sub.platform.periodEnd ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {fmt(t("account.platformRenewal"), {
                        date: new Date(sub.platform.periodEnd).toLocaleDateString("fr-FR"),
                      })}
                    </p>
                  ) : null}
                </div>
                <Link href="/leads" className="btn-solar !py-2 text-sm">
                  {t("account.platformCta")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="card mt-8 p-5 text-sm text-slate-400">
              {t("account.noPlatform")}{" "}
              <Link href="/#tarifs" className="text-solar underline">
                {t("account.platformLink")}
              </Link>
            </div>
          )}

          {sub?.active ? (
            <div className="card mt-4 border-white/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">{t("account.packTitle")}</div>
                  <p className="mt-1 text-sm text-slate-400">
                    {fmt(t("account.packCredits"), {
                      remaining: sub.remaining,
                      quota: sub.quota,
                    })}
                  </p>
                </div>
                <Link href="/leads?tier=premium" className="btn-ghost !py-2 text-sm">
                  {t("account.chooseLead")}
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{t("account.myLeads")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("account.myLeadsHint")}</p>
            </div>
            <Link href="/leads" className="btn-ghost !py-2 text-sm">
              {t("account.buyLead")}
            </Link>
          </div>

          {leads === null && <p className="mt-4 text-slate-400">{t("common.loading")}</p>}
          {error && <p className="mt-4 text-red-300">{error}</p>}

          {leads && leads.length === 0 && (
            <div className="card mt-4 p-8 text-center text-slate-400">
              <p>{t("account.noLeads")}</p>
              <Link href="/leads" className="btn-solar mt-4 inline-flex !py-2 text-sm">
                {t("account.browseCatalog")}
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
                        <div className="text-xs text-slate-500">
                          {t("account.siteLabel")} {l.nom_osm}
                        </div>
                      ) : null}
                      <div className="text-sm text-slate-400">
                        {l.ville || "—"} ({l.departement}) · {nf(l.surface_m2)} m² · {nf(l.puissance_kwc)} kWc
                        {" · "}
                        {t("account.coverage")} {displayRecouvrementSummary(l).short}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm">
                      <div className="text-right">
                        <div className="font-semibold text-solar">{euros(l.valeur_chantier_eur)}</div>
                        <div className="text-slate-500">{t("account.estimatedProject")}</div>
                      </div>
                      <Link href={`/leads/${l.id}?from=mon-espace`} className="btn-ghost !px-3 !py-1.5 text-xs">
                        {t("account.viewFull")}
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

          <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{t("account.myRfps")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("account.myRfpsHint")}</p>
            </div>
            <Link href="/appels-offres" className="btn-ghost !py-2 text-sm">
              {t("account.buyRfp")}
            </Link>
          </div>

          {rfps === null && <p className="mt-4 text-slate-400">{t("common.loading")}</p>}

          {rfps && rfps.length === 0 && (
            <div className="card mt-4 p-8 text-center text-slate-400">
              <p>{t("account.noRfps")}</p>
              <Link href="/appels-offres" className="btn-solar mt-4 inline-flex !py-2 text-sm">
                {t("account.browseRfps")}
              </Link>
            </div>
          )}

          {rfps && rfps.length > 0 && (
            <div className="mt-4 space-y-3">
              {rfps.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.entreprise}</span>
                        <SolutionTypeBadge type={resolveRfpSolutionType(r.type_solution_recherchee)} compact />
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {r.adresse}
                        {r.departement ? ` · Dép. ${r.departement}` : ""}
                        {r.surface_estimee_m2 ? ` · ${nf(r.surface_estimee_m2)} m²` : ""}
                        {r.solar ? ` · ${nf(r.solar.puissance_kwc)} kWc` : ""}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {fmt(t("account.rfpPurchasedOn"), {
                          date: new Date(r.purchased_at).toLocaleDateString("fr-FR"),
                        })}
                        {" · "}
                        {r.montant_eur} €
                      </p>
                      {r.listing_statut === "ferme" ? (
                        <p className="mt-2 text-xs text-amber-300/90">{t("account.rfpListingClosed")}</p>
                      ) : null}
                    </div>
                    <Link
                      href={`/appels-offres/${r.id}?from=mon-espace`}
                      className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs"
                    >
                      {t("account.viewRfpFull")}
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Info k="Contact" v={r.contact_nom} />
                    <Info k="Fonction" v={r.contact_fonction} />
                    <Info k="Email" v={r.contact_email} />
                    <Info k="Téléphone" v={r.contact_telephone} />
                    <Info k="Adresse parking" v={r.adresse} wide />
                  </div>
                </div>
              ))}
            </div>
          )}

          <MyRfpSubmissionsPanel variant="installer" />
        </>
      ) : null}

      <DeleteAccountPanel />
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
