interface LeadAvailabilityBadgeProps {
  available: boolean;
}

export default function LeadAvailabilityBadge({ available }: LeadAvailabilityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        available ? "bg-accent/15 text-accent" : "bg-white/10 text-slate-400"
      }`}
      title={available ? "Lead disponible à l'achat" : "Lead indisponible"}
    >
      {available ? "Disponible" : "Indisponible"}
    </span>
  );
}
