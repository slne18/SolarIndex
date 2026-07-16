"use client";

import {
  APER_DEADLINE_40,
  APER_DEADLINE_50,
  APER_DEADLINE_SMALL_WAVE,
  APER_LAW_START,
  countdownProgress,
  daysUntil,
} from "@/lib/aper-deadlines";
import { getAperDeadlineWave, type AperDeadlineWave } from "@/lib/aper-law";

export interface CountdownProps {
  variant?: "compact" | "full" | "timeline";
  targetDate?: string;
  /** Vague calendrier affichée (alignée cartes landing). */
  wave?: AperDeadlineWave;
  /** Échéance ratio de couverture — usage vérificateur (40 % / 50 % grands parcs). */
  obligation?: "40" | "50";
  theme?: "light" | "dark";
}

function resolveTarget(
  wave: AperDeadlineWave | undefined,
  obligation: "40" | "50",
  targetDate?: string,
): Date {
  if (targetDate) return new Date(targetDate);
  if (wave === "large") return APER_DEADLINE_40;
  if (wave === "small") return APER_DEADLINE_SMALL_WAVE;
  return obligation === "40" ? APER_DEADLINE_40 : APER_DEADLINE_50;
}

export default function RegulatoryCountdown({
  variant = "full",
  targetDate,
  wave,
  obligation = "50",
  theme = "light",
}: CountdownProps) {
  const target = resolveTarget(wave, obligation, targetDate);
  const progress = countdownProgress(APER_LAW_START, target);
  const days = daysUntil(target);
  const dark = theme === "dark";
  const waveMeta = wave ? getAperDeadlineWave(wave) : null;

  if (variant === "timeline" && waveMeta) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-extrabold tabular-nums text-slate-900">{waveMeta.year}</span>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {waveMeta.month}
          </span>
          {waveMeta.status === "current" ? (
            <span className="rounded-full bg-solar/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-solar-700">
              Prochaine vague
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-800">{waveMeta.surface}</p>
        <p className="text-xs text-slate-500">{waveMeta.date}</p>
        <p className="mt-2 text-xs text-slate-500">
          Amende max. <span className="font-semibold text-slate-700">{waveMeta.fine}</span>
        </p>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-solar to-solar-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">
          {days > 0 ? `${days} jours restants` : "Échéance atteinte"}
        </p>
        <p className="mt-1 text-xs text-slate-500">Loi APER · depuis janv. 2024</p>
      </div>
    );
  }

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
          {days > 0 ? `${days} jours restants` : "Échéance atteinte"}
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
          <span>{days > 0 ? `${days} j restants` : "Échéance atteinte"}</span>
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
      {waveMeta ? (
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {waveMeta.year} · {waveMeta.surface}
          </p>
          <p className="mt-1 text-sm text-slate-600">Amende max. {waveMeta.fine}</p>
        </div>
      ) : obligation === "40" ? (
        <p className="mb-4 text-xs text-slate-500">Grands parcs · obligation 40 %</p>
      ) : (
        <p className="mb-4 text-xs text-slate-500">
          {obligation === "50" && !wave
            ? "Grands parcs · obligation 50 % (2027) ou vagues surface"
            : "Obligation 50 %"}
        </p>
      )}
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
        {days > 0 ? `${days} jours restants` : "Échéance atteinte"}
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
