"use client";

import {
  APER_DEADLINE_40,
  APER_DEADLINE_50,
  APER_LAW_START,
  countdownProgress,
  daysUntil,
} from "@/lib/aper-deadlines";

export interface CountdownProps {
  variant?: "compact" | "full" | "timeline";
  targetDate?: string;
  obligation?: "40" | "50";
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
  const dark = theme === "dark";

  if (variant === "timeline") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-solar to-solar-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">
          {days} jours restants
        </p>
        <p className="mt-1 text-xs text-slate-500">Loi APER · depuis janv. 2024</p>
      </div>
    );
  }

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

  const dateLabel = target.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  return (
    <div className={`${dark ? "card" : "rounded-2xl border border-slate-200 bg-white"} p-5 sm:p-6`}>
      <div
        className={`mt-0 h-3 overflow-hidden rounded-full ${
          dark ? "bg-white/10" : "bg-slate-200"
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-solar to-solar-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className={`mt-4 text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
        {days} jours restants
      </p>
      <p className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}>
        Loi APER · depuis janv. 2024
      </p>
      <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
        ({dateLabel})
      </p>
    </div>
  );
}
