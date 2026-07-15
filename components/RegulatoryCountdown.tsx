"use client";

import {
  APER_DEADLINE_40,
  APER_DEADLINE_50,
  APER_LAW_START,
  countdownProgress,
  daysUntil,
} from "@/lib/aper-deadlines";

export interface CountdownProps {
  variant?: "compact" | "full";
  targetDate?: string;
  obligation?: "40" | "50";
  /** "light" sur fond blanc (landing), "dark" sur fond night (verifier). */
  theme?: "light" | "dark";
}

function resolveTarget(obligation: "40" | "50", targetDate?: string): Date {
  if (targetDate) return new Date(targetDate);
  return obligation === "40" ? APER_DEADLINE_40 : APER_DEADLINE_50;
}

export default function RegulatoryCountdown({
  variant = "full",
  targetDate,
  obligation = "50",
  theme = "light",
}: CountdownProps) {
  const target = resolveTarget(obligation, targetDate);
  const progress = countdownProgress(APER_LAW_START, target);
  const days = daysUntil(target);
  const title =
    obligation === "40"
      ? "Échéance obligation 40 %"
      : "Échéance obligation 50 %";
  const dateLabel = target.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  const dark = theme === "dark";

  if (variant === "compact") {
    return (
      <div
        className={`rounded-xl border px-3 py-2 ${
          dark ? "border-white/10 bg-night-800/50" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 text-xs ${
            dark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <span>{days} j restants</span>
          <span>{progress} %</span>
        </div>
        <div
          className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${
            dark ? "bg-white/10" : "bg-slate-200"
          }`}
        >
          <div
            className="h-full rounded-full bg-solar transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${dark ? "card" : "rounded-2xl border border-slate-200 bg-white"} p-5 sm:p-6`}>
      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          dark ? "text-slate-200" : "text-slate-900"
        }`}
      >
        <span aria-hidden>🕐</span>
        {title}
      </div>
      <div
        className={`mt-4 h-3 overflow-hidden rounded-full ${
          dark ? "bg-white/10" : "bg-slate-200"
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-solar to-solar-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className={`mt-2 flex items-center justify-between text-xs ${
          dark ? "text-slate-500" : "text-slate-500"
        }`}
      >
        <span>{progress} % du délai écoulé</span>
        <span>Loi APER · depuis janv. 2024</span>
      </div>
      <p
        className={`mt-4 text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}
      >
        {days} jours restants
      </p>
      <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
        ({dateLabel})
      </p>
    </div>
  );
}
