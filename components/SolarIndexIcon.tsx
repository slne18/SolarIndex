export default function SolarIndexIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="4.25" fill="currentColor" stroke="none" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.25v2.5M12 19.25v2.5M4.75 4.75l1.75 1.75M17.5 17.5l1.75 1.75M2.25 12h2.5M19.25 12h2.5M4.75 19.25l1.75-1.75M17.5 6.5l1.75-1.75" />
      </g>
    </svg>
  );
}
