import type { ReactNode } from "react";
import Link from "next/link";

export interface HeroActionItem {
  href: string;
  label: string;
  hint?: string;
  step?: number;
  icon?: ReactNode;
}

export default function HeroActionList({
  items,
  className = "",
  badge,
}: {
  items: HeroActionItem[];
  className?: string;
  /** Court libellé au-dessus de la liste (ex. gratuité). */
  badge?: string;
}) {
  return (
    <div className="hero-actions-wrap">
      {badge ? <p className="hero-actions-badge">{badge}</p> : null}
      <div className={`hero-actions ${badge ? "mt-3" : "mt-8"} ${className}`.trim()}>
        {items.map((item) => (
        <Link key={item.href} href={item.href} className="hero-action group">
          {item.step != null ? (
            <span className="hero-action-step" aria-hidden>
              {item.step}
            </span>
          ) : item.icon ? (
            <span className="hero-action-icon" aria-hidden>
              {item.icon}
            </span>
          ) : null}
          <span className="hero-action-body">
            <span className="hero-action-label">{item.label}</span>
            {item.hint ? <span className="hero-action-hint">{item.hint}</span> : null}
          </span>
          <svg
            className="hero-action-arrow"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ))}
      </div>
    </div>
  );
}

export function HeroActionRadarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" opacity="0.35" />
      <circle cx="12" cy="12" r="5.5" opacity="0.55" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 12 L20 6" strokeLinecap="round" />
    </svg>
  );
}

export function HeroActionDocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M8 4h8l2 2v14H6V4h2z" strokeLinejoin="round" />
      <path d="M8 4v2h8V4" />
      <path d="M9 11h6M9 14h6M9 17h4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function HeroActionCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeroActionCalculatorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" strokeLinecap="round" />
      <path d="M8 11h2M12 11h2M16 11h2M8 15h2M12 15h2M16 15h2" strokeLinecap="round" />
    </svg>
  );
}

export function HeroActionUploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 16V4M12 4l4 4M12 4L8 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
    </svg>
  );
}
