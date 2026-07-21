import type { ReactNode } from "react";

/** Soleil SolarIndex pour favicons (ImageResponse / next/og). */

export const FAVICON_BG =
  "linear-gradient(145deg, #fcd34d 0%, #f59e0b 52%, #d97706 100%)";
export const FAVICON_SUN = "#111827";

/** Favicon 16–32 px : disque épais seul (les rayons deviennent illisibles). */
export function FaviconSunCompact({ size }: { size: number }) {
  const core = Math.round(size * 0.44);

  return (
    <div
      style={{
        width: core,
        height: core,
        borderRadius: "50%",
        background: FAVICON_SUN,
      }}
    />
  );
}

/** Apple touch / grandes tailles : même soleil que le header. */
export function FaviconSunFull({ size }: { size: number }) {
  const icon = Math.round(size * 0.58);

  return (
    <svg
      width={icon}
      height={icon}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="4.75" fill={FAVICON_SUN} />
      <g stroke={FAVICON_SUN} strokeWidth={2.25} strokeLinecap="round">
        <path d="M12 2.25v2.75M12 19v2.75M4.5 4.5l2 2M17.5 17.5l2 2M2.25 12h2.75M19 12h2.75M4.5 19.5l2-2M17.5 6.5l2-2" />
      </g>
    </svg>
  );
}

export function FaviconTile({
  size,
  radius,
  children,
}: {
  size: number;
  radius: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: FAVICON_BG,
        borderRadius: radius,
      }}
    >
      {children}
    </div>
  );
}
