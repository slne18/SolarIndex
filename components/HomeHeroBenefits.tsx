"use client";

import { useTranslations } from "@/components/LocaleProvider";

const BENEFITS = [
  { key: "home.benefit1" as const, icon: BenefitSearchIcon, compact: true },
  { key: "home.benefit2" as const, icon: BenefitSolarIcon, compact: false },
  { key: "home.benefit3" as const, icon: BenefitHandshakeIcon, compact: false },
  { key: "home.benefit4" as const, icon: BenefitTransitionIcon, compact: false },
] as const;

export default function HomeHeroBenefits() {
  const t = useTranslations();

  return (
    <ul className="home-hero-benefits mt-10">
      {BENEFITS.map(({ key, icon: Icon, compact }) => (
        <li key={key} className="home-hero-benefit">
          <span className="home-hero-benefit-icon" aria-hidden>
            <Icon />
          </span>
          <span className={compact ? "home-hero-benefit-label home-hero-benefit-label-compact" : "home-hero-benefit-label"}>
            {t(key)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BenefitSearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function BenefitSolarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function BenefitHandshakeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M11 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 12l2 2M3 16l3-3 2 2 4-4 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BenefitTransitionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 22c4-4 8-7.5 8-12a8 8 0 10-16 0c0 4.5 4 8 8 12z" strokeLinejoin="round" />
      <path d="M12 13a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
  );
}
