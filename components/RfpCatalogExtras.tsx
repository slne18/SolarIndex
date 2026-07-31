import { eurosCompact, nf } from "@/lib/format";
import type { PublicRfp } from "@/lib/rfp";
import { RFP_OWNER_TYPE_LABELS } from "@/lib/rfp-official";

export function RfpOfficialBadge({
  rfp,
  light = false,
}: {
  rfp: Pick<PublicRfp, "ao_publie_officiellement">;
  light?: boolean;
}) {
  if (!rfp.ao_publie_officiellement) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        light ? "bg-blue-100 text-blue-800" : "bg-blue-500/15 text-blue-200"
      }`}
    >
      AO officiel référencé
    </span>
  );
}

export function RfpOfficialLinkButton({
  href,
  className = "btn-solar",
}: {
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} inline-flex items-center justify-center gap-2`}
    >
      Consulter le dossier officiel
      <span aria-hidden>↗</span>
    </a>
  );
}

export function RfpSolarMetricsCard({ rfp }: { rfp: PublicRfp }) {
  const solar = rfp.solar;
  if (!solar) return null;

  return (
    <div className="text-sm">
      <h3 className="font-semibold text-slate-900">Potentiel photovoltaïque estimé</h3>
      <p className="mt-1 text-xs text-slate-500">Indicatif — simulateur SolarIndex, non audit.</p>
      <dl className="mt-4 grid gap-x-6 gap-y-0 sm:grid-cols-2">
        <Metric k="Puissance estimée" v={`${nf(solar.puissance_kwc)} kWc`} />
        <Metric k="Production estimée" v={`${nf(solar.production_kwh_an)} kWh/an`} />
        <Metric k="CA autoconsommation" v={`${eurosCompact(solar.ca_autoconsommation_eur)}/an`} />
        <Metric k="CA injection EDF OA" v={`${eurosCompact(solar.ca_injection_edf_oa_eur)}/an`} />
        <Metric k="Valeur chantier" v={eurosCompact(solar.valeur_chantier_eur)} />
        <Metric
          k="Loi APER"
          v={solar.aper_eligible ? "Surface ≥ seuil APER" : "Sous seuil APER"}
        />
        {rfp.nombre_places ? <Metric k="Places" v={nf(rfp.nombre_places)} /> : null}
        {rfp.type_proprietaire ? (
          <Metric k="Type propriétaire" v={RFP_OWNER_TYPE_LABELS[rfp.type_proprietaire]} />
        ) : null}
      </dl>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </div>
  );
}

export function formatRfpDeadline(date: string | null): string {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
