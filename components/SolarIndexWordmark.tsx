/** Marque « SolarIndex » — un seul mot, sans coupure entre Solar et Index. */
export default function SolarIndexWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-wordmark whitespace-nowrap ${className}`.trim()} aria-label="SolarIndex">
      Solar<span className="text-solar">Index</span>
    </span>
  );
}
