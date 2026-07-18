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
}: {
  items: HeroActionItem[];
  className?: string;
}) {
  return (
    <div className={`hero-actions ${className}`.trim()}>
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
