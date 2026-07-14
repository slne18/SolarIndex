"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminClientsByRegion, AdminDashboardData } from "@/lib/admin-data";
import { ADMIN_LEAD_CSV_COLUMNS } from "@/lib/admin-csv";
import {
  adminFetch,
  clearStoredAdminToken,
  getStoredAdminToken,
  leadQueryToSearchParams,
  setStoredAdminToken,
} from "@/lib/admin-client";
import type { LeadRow } from "@/lib/types";
import { euros, nf } from "@/lib/format";

const SORTABLE = new Set([
  "created_at",
  "valeur_chantier_eur",
  "surface_m2",
  "score_confiance",
  "buyers_count",
  "departement",
  "region",
  "ville",
  "statut",
  "detection",
  "pv_overlap_pct",
]);

const COL_LABELS: Partial<Record<keyof LeadRow, string>> = {
  id: "ID",
  created_at: "Créé le",
  osm_id: "OSM ID",
  departement: "Dépt",
  region: "Région",
  ville: "Ville",
  adresse: "Adresse",
  nom_osm: "Nom OSM",
  surface_m2: "Surface m²",
  surface_solaire_m2: "Surf. solaire",
  puissance_kwc: "kWc",
  valeur_chantier_eur: "Valeur €",
  flag_urgence: "Flag",
  siren: "SIREN",
  raison_sociale: "Raison sociale",
  code_naf: "NAF",
  libelle_naf: "Libellé NAF",
  dirigeant_nom: "Dirigeant (legacy)",
  dirigeant_exploitant: "Dir. exploitant",
  dirigeant_proprietaire: "Dir. propriétaire",
  telephone: "Tél. (legacy)",
  telephone_exploitant: "Tél. exploitant",
  telephone_proprietaire: "Tél. propriétaire",
  email_contact: "Email",
  id_parcelle: "Parcelle",
  code_insee: "INSEE",
  latitude: "Lat.",
  longitude: "Lon.",
  pv_overlap_pct: "Recouv. PV",
  pv_registry_count: "Registre PV",
  detection: "Détection",
  buyers_count: "Acheteurs",
  statut: "Statut",
  score_confiance: "Confiance",
  proprietaire_foncier: "Prop. foncier",
  siren_proprietaire_foncier: "SIREN prop. foncier",
  vision_flag: "Vision flag",
  vision_surface_couverte_pct: "Vision %",
  vision_ortho_date: "Date ortho",
  source_surface: "Source surf.",
  surface_tag_present: "Tag surface",
  derogation_pente: "Dérog. pente",
  derogation_abf: "Dérog. ABF",
  prix_vente_eur: "Prix vente",
};

type LeadFilters = {
  region: string;
  departement: string;
  statut: string;
  detection: string;
  flag: string;
  search: string;
};

const DEFAULT_FILTERS: LeadFilters = {
  region: "",
  departement: "",
  statut: "",
  detection: "",
  flag: "",
  search: "",
};

export default function AdminDashboard() {
  const [tokenInput, setTokenInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [clients, setClients] = useState<AdminClientsByRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [visibleCols, setVisibleCols] = useState<(keyof LeadRow)[]>(
    ADMIN_LEAD_CSV_COLUMNS,
  );

  const [notifyRegion, setNotifyRegion] = useState("");
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<string | null>(null);

  const verifyAndLoad = useCallback(async (token?: string) => {
    setLoading(true);
    setError(null);
    setAuthError(null);
    try {
      const dashRes = await adminFetch("/api/admin/dashboard");
      if (dashRes.status === 401) {
        clearStoredAdminToken();
        setAuthed(false);
        setAuthError("Token admin invalide.");
        return;
      }
      if (!dashRes.ok) throw new Error("Dashboard inaccessible.");
      setDashboard(await dashRes.json());
      setAuthed(true);
      setError(null);

      const q = leadQueryToSearchParams({
        page,
        pageSize,
        sort,
        order,
        region: filters.region || undefined,
        departement: filters.departement || undefined,
        statut: filters.statut || undefined,
        detection: filters.detection || undefined,
        flag: filters.flag || undefined,
        search: filters.search || undefined,
      });

      const errors: string[] = [];
      const [leadsRes, clientsRes] = await Promise.all([
        adminFetch(`/api/admin/leads?${q}`),
        adminFetch("/api/admin/clients"),
      ]);

      if (leadsRes.ok) {
        const leadsJson = await leadsRes.json();
        setLeads(leadsJson.leads ?? []);
        setLeadsTotal(leadsJson.total ?? 0);
      } else {
        setLeads([]);
        setLeadsTotal(0);
        const body = await leadsRes.json().catch(() => ({}));
        errors.push(body.error || `Leads HTTP ${leadsRes.status}`);
      }

      if (clientsRes.ok) {
        const clientsJson = await clientsRes.json();
        setClients(clientsJson.regions ?? []);
        if (!notifyRegion && clientsJson.regions?.[0]?.region) {
          setNotifyRegion(clientsJson.regions[0].region);
        }
      } else {
        setClients([]);
        const body = await clientsRes.json().catch(() => ({}));
        errors.push(body.error || `Clients HTTP ${clientsRes.status}`);
      }

      if (errors.length > 0) {
        setError(errors.join(" · "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, order, filters]);

  useEffect(() => {
    const stored = getStoredAdminToken();
    if (stored) {
      setAuthed(true);
      verifyAndLoad();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authed && getStoredAdminToken()) verifyAndLoad();
  }, [page, pageSize, sort, order, filters, authed, verifyAndLoad]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStoredAdminToken(tokenInput.trim());
    verifyAndLoad(tokenInput.trim());
  }

  function handleLogout() {
    clearStoredAdminToken();
    setAuthed(false);
    setDashboard(null);
    setLeads([]);
    setClients([]);
  }

  function toggleSort(col: keyof LeadRow) {
    if (!SORTABLE.has(col)) return;
    if (sort === col) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setOrder("desc");
    }
    setPage(0);
  }

  async function exportCsv() {
    const q = leadQueryToSearchParams({
      sort,
      order,
      region: filters.region || undefined,
      departement: filters.departement || undefined,
      statut: filters.statut || undefined,
      detection: filters.detection || undefined,
      flag: filters.flag || undefined,
      search: filters.search || undefined,
    });
    const res = await adminFetch(`/api/admin/leads/export?${q}`);
    if (!res.ok) {
      alert("Export échoué.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solarindex-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendRegionalNotify() {
    setNotifyStatus(null);
    const res = await adminFetch("/api/admin/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: notifyRegion,
        subject: notifySubject,
        message: notifyMessage,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotifyStatus(data.error || "Envoi échoué.");
      return;
    }
    setNotifyStatus(`${data.sent} email(s) envoyé(s) · ${data.recipients} destinataires.`);
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(leadsTotal / pageSize)),
    [leadsTotal, pageSize],
  );

  if (!authed) {
    return (
      <div className="container-x flex min-h-screen items-center justify-center py-16">
        <form onSubmit={handleLogin} className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold">Admin SolarIndex</h1>
          <p className="mt-2 text-sm text-slate-400">
            Accès restreint — token <code className="text-solar">ADMIN_SECRET_TOKEN</code>.
          </p>
          <input
            type="password"
            className="mt-6 w-full rounded-lg border border-white/15 bg-night-800 px-4 py-2.5 text-sm"
            placeholder="Token admin"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoComplete="off"
          />
          {authError && <p className="mt-3 text-sm text-red-300">{authError}</p>}
          <button type="submit" className="btn-solar mt-6 w-full">
            Accéder
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container-x space-y-8 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Données sensibles en clair — usage interne uniquement.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => verifyAndLoad()}
            className="btn-ghost text-sm"
            disabled={loading}
          >
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
          <button type="button" onClick={handleLogout} className="btn-ghost text-sm">
            Déconnexion
          </button>
        </div>
      </header>

      {error && (
        <div className="card border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* 1. Stats */}
      {dashboard && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="CA du mois" value={euros(dashboard.stats.ca_mois_eur)} />
          <StatCard label="Ventes totales" value={nf(dashboard.stats.ventes_totales)} />
          <StatCard
            label="Catalogue vendable"
            value={nf(dashboard.stats.catalogue_vendables)}
          />
          <StatCard
            label="Leads en base (slots ouverts)"
            value={nf(dashboard.stats.leads_disponibles)}
          />
          <StatCard label="Clients actifs" value={nf(dashboard.stats.clients_actifs)} />
        </section>
      )}

      {dashboard?.vision && dashboard.vision.vision_backlog === 0 && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Urgences vendables"
            value={nf(dashboard.vision.urgences_vendables)}
          />
          <StatCard
            label="Exclus photo (> 45 %)"
            value={nf(dashboard.vision.urgences_exclues_photo)}
          />
          <StatCard
            label="Ombrière possible (≤ 45 %)"
            value={nf(dashboard.vision.urgences_ombriere_doute)}
          />
          <StatCard
            label="Vision urgences"
            value={`${nf(dashboard.vision.urgences_vision_done)} / ${nf(dashboard.vision.urgences_brut)}`}
          />
        </section>
      )}

      {/* 2. Alertes */}
      {dashboard && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Alertes</h2>
          {dashboard.alerts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Aucune alerte.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {dashboard.alerts.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    a.severity === "danger"
                      ? "border-red-500/40 bg-red-500/10"
                      : a.severity === "warning"
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-white/10 bg-night-800/60"
                  }`}
                >
                  <div className="font-medium text-slate-100">
                    {a.title}
                    {a.count != null ? (
                      <span className="ml-2 tabular-nums text-solar">({nf(a.count)})</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-slate-400">{a.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 3. Leads */}
      <section className="card overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Leads ({nf(leadsTotal)})</h2>
          <button type="button" onClick={exportCsv} className="btn-solar text-sm">
            Export CSV
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterInput
            label="Recherche"
            value={filters.search}
            onChange={(v) => {
              setFilters((f) => ({ ...f, search: v }));
              setPage(0);
            }}
            placeholder="Ville, SIREN, RS…"
          />
          <FilterInput
            label="Région"
            value={filters.region}
            onChange={(v) => {
              setFilters((f) => ({ ...f, region: v }));
              setPage(0);
            }}
          />
          <FilterInput
            label="Département"
            value={filters.departement}
            onChange={(v) => {
              setFilters((f) => ({ ...f, departement: v }));
              setPage(0);
            }}
          />
          <FilterSelect
            label="Statut"
            value={filters.statut}
            options={["", "disponible", "complet", "vendu", "reserve", "expiré"]}
            onChange={(v) => {
              setFilters((f) => ({ ...f, statut: v }));
              setPage(0);
            }}
          />
          <FilterSelect
            label="Détection"
            value={filters.detection}
            options={["", "libre", "a_verifier", "equipe"]}
            onChange={(v) => {
              setFilters((f) => ({ ...f, detection: v }));
              setPage(0);
            }}
          />
          <FilterSelect
            label="Flag"
            value={filters.flag}
            options={["", "URGENCE_ABSOLUE", "CONFORME_REQUIS"]}
            onChange={(v) => {
              setFilters((f) => ({ ...f, flag: v }));
              setPage(0);
            }}
          />
        </div>

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-slate-400 hover:text-white">
            Colonnes visibles ({visibleCols.length}/{ADMIN_LEAD_CSV_COLUMNS.length})
          </summary>
          <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {ADMIN_LEAD_CSV_COLUMNS.map((col) => (
              <label key={col} className="flex items-center gap-1.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={visibleCols.includes(col)}
                  onChange={() => {
                    setVisibleCols((cols) =>
                      cols.includes(col) ? cols.filter((c) => c !== col) : [...cols, col],
                    );
                  }}
                />
                {COL_LABELS[col] ?? col}
              </label>
            ))}
          </div>
        </details>

        <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="bg-night-700/60 text-slate-400">
              <tr>
                {visibleCols.map((col) => (
                  <th key={col} className="whitespace-nowrap px-2 py-2">
                    {SORTABLE.has(col) ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className="font-semibold hover:text-white"
                      >
                        {COL_LABELS[col] ?? col}
                        {sort === col ? (order === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    ) : (
                      COL_LABELS[col] ?? col
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/5">
                  {visibleCols.map((col) => (
                    <td key={col} className="max-w-[220px] truncate px-2 py-1.5 text-slate-200">
                      {formatCell(lead[col], col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Page</span>
            <button
              type="button"
              className="btn-ghost !px-2 !py-1"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span className="tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="btn-ghost !px-2 !py-1"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
            <select
              className="rounded border border-white/15 bg-night-800 px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 4. Clients par région */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Clients par région</h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {clients.map((group) => (
              <div key={group.region} className="rounded-lg border border-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-white">{group.region}</h3>
                  <span className="text-sm text-solar">
                    {euros(group.total_spent_eur)} · {group.clients.length} client(s)
                  </span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1 pr-3">Entreprise</th>
                        <th className="py-1 pr-3">Email</th>
                        <th className="py-1 pr-3">Plan</th>
                        <th className="py-1 pr-3 text-right">Dépensé</th>
                        <th className="py-1 text-right">Leads</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {group.clients.map((c) => (
                        <tr key={c.id}>
                          <td className="py-1.5 pr-3">{c.entreprise || "—"}</td>
                          <td className="py-1.5 pr-3">{c.email || "—"}</td>
                          <td className="py-1.5 pr-3">{c.plan || "free"}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums text-solar">
                            {euros(c.total_spent_eur)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{c.leads_achetes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-lg border border-white/10 bg-night-800/40 p-4">
            <h3 className="font-semibold">Notification géographique</h3>
            <p className="mt-2 text-xs text-slate-400">
              Envoie un email à tous les clients de la région sélectionnée (via Resend).
            </p>
            <label className="mt-4 block text-xs text-slate-400">
              Région
              <select
                className="mt-1 w-full rounded border border-white/15 bg-night-800 px-3 py-2 text-sm"
                value={notifyRegion}
                onChange={(e) => setNotifyRegion(e.target.value)}
              >
                {clients.map((g) => (
                  <option key={g.region} value={g.region}>
                    {g.region} ({g.clients.length})
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs text-slate-400">
              Objet
              <input
                className="mt-1 w-full rounded border border-white/15 bg-night-800 px-3 py-2 text-sm"
                value={notifySubject}
                onChange={(e) => setNotifySubject(e.target.value)}
                placeholder="Nouveaux leads en Occitanie"
              />
            </label>
            <label className="mt-3 block text-xs text-slate-400">
              Message
              <textarea
                className="mt-1 w-full rounded border border-white/15 bg-night-800 px-3 py-2 text-sm"
                rows={5}
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="Bonjour, de nouveaux parkings APER sont disponibles dans votre zone…"
              />
            </label>
            <button
              type="button"
              className="btn-solar mt-4 w-full text-sm"
              onClick={sendRegionalNotify}
            >
              Envoyer la notification
            </button>
            {notifyStatus && (
              <p className="mt-3 text-xs text-slate-400">{notifyStatus}</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <input
        className="mt-1 w-full rounded border border-white/15 bg-night-800 px-3 py-1.5 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <select
        className="mt-1 w-full rounded border border-white/15 bg-night-800 px-3 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o || "all"} value={o}>
            {o || "Tous"}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatCell(value: unknown, col: keyof LeadRow): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "oui" : "non";
  if (col === "pv_overlap_pct" && typeof value === "number") {
    return `${(value * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}\u00a0%`;
  }
  if (col === "valeur_chantier_eur" && typeof value === "number") {
    return euros(value);
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && col === "created_at") {
    return new Date(value).toLocaleString("fr-FR");
  }
  return String(value);
}
