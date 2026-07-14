"use client";

import { useEffect, useRef, useState } from "react";

const ELIGIBLE_PARKINGS = 55_000;
const MARKET_VALUE_KWC_EUR = 1_200;

function useCountUp(to: number, active: boolean, durationMs = 1200) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };

    setValue(0);
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [to, active, durationMs]);

  return value;
}

function StatCard({
  to,
  suffix,
  label,
  sub,
  hint,
}: {
  to: number;
  suffix: string;
  label: string;
  sub: string;
  hint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const value = useCountUp(to, inView || hovered);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group/stat relative overflow-hidden rounded-2xl border border-white/[0.08] bg-night-800/55 p-6 transition-all duration-300 ease-out sm:p-8 group-hover/stats:opacity-40 hover:!opacity-100 hover:border-solar/30 hover:bg-solar/[0.05] hover:shadow-[0_0_48px_-14px_rgba(232,168,32,0.35)]"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-solar/[0.07] blur-2xl transition-opacity duration-300 opacity-0 group-hover/stat:opacity-100"
        aria-hidden
      />

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tabular-nums tracking-tight text-white transition-colors duration-300 group-hover/stat:text-solar sm:text-5xl">
          {value.toLocaleString("fr-FR")}
        </span>
        <span className="text-2xl font-bold tabular-nums text-solar sm:text-3xl">{suffix}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-300">{sub}</p>
      {hint ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500 transition-colors duration-300 group-hover/stat:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function SolutionStats() {
  return (
    <div className="group/stats mt-8 grid gap-4 sm:grid-cols-2">
      <StatCard
        to={ELIGIBLE_PARKINGS}
        suffix="+"
        label="Parkings éligibles"
        sub="OpenStreetMap · France entière"
      />
      <StatCard
        to={MARKET_VALUE_KWC_EUR}
        suffix=" €"
        label="Valeur marché / kWc"
        sub="Estimation marché · 2026"
        hint="Base de calcul de la valeur chantier sur chaque fiche lead."
      />
    </div>
  );
}
