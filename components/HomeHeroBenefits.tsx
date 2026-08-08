"use client";

import { useTranslations } from "@/components/LocaleProvider";

const BENEFITS = [
  { key: "home.benefit1" as const, icon: BenefitSearchIcon },
  { key: "home.benefit2" as const, icon: BenefitSolarIcon },
  { key: "home.benefit3" as const, icon: BenefitPartnersIcon },
  { key: "home.benefit4" as const, icon: BenefitTransitionIcon },
] as const;

export default function HomeHeroBenefits() {
  const t = useTranslations();

  return (
    <ul className="home-hero-benefits">
      {BENEFITS.map(({ key, icon: Icon }) => {
        const lines = t(key).split("\n");

        return (
          <li key={key} className="home-hero-benefit home-hero-benefit-card">
            <span className="home-hero-benefit-icon" aria-hidden>
              <Icon />
            </span>
            <span className="home-hero-benefit-label">
              {lines.map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function BenefitSearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function BenefitSolarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function BenefitPartnersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m11 17 2 2a1 1 0 1 0 3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m21 3 1 11h-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BenefitTransitionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 22c4-4 8-7.5 8-12a8 8 0 10-16 0c0 4.5 4 8 8 12z" strokeLinejoin="round" />
      <path d="M12 13a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
  );
}
