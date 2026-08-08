"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  APER_DEADLINE_40,
  APER_DEADLINE_50,
  APER_DEADLINE_SMALL_WAVE,
  APER_LAW_START,
  countdownProgress,
  daysUntil,
} from "@/lib/aper-deadlines";
import {
  getAperDeadlineWave,
  getAperWaveStatus,
  parseAperWaveTargetDate,
  type AperDeadlineWave,
} from "@/lib/aper-law";
import OwnerPersonaHomeLink from "@/components/OwnerPersonaHomeLink";
import { useTranslations } from "@/components/LocaleProvider";
import { fmt } from "@/lib/i18n/format";

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

function useLiveNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();

    const intervalId = window.setInterval(tick, 60_000);

    const scheduleMidnight = () => {
      const next = new Date();
      next.setHours(24, 0, 0, 0);
      return window.setTimeout(() => {
        tick();
        midnightId = scheduleMidnight();
      }, next.getTime() - Date.now());
    };

    let midnightId = scheduleMidnight();

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(midnightId);
    };
  }, []);

  return now;
}

function fineAmountLabel(fine: string): string {
  return fine.replace(/\/an\s*$/, "").trim();
}

function AperCalendarCard({
  wave,
  now,
}: {
  wave: AperDeadlineWave;
  now: Date;
}) {
  const t = useTranslations();
  const waveMeta = getAperDeadlineWave(wave);
  const waveStatus = getAperWaveStatus(wave, now);
  const target = parseAperWaveTargetDate(waveMeta.targetDate);
  const days = daysUntil(target, now);
  const passed = waveStatus === "passed";
  const isCurrent = waveStatus === "current";
  const isLarge = wave === "large";

  const badge = passed
    ? { label: t("countdown.badgePassed"), className: "bg-amber-100 text-amber-800" }
    : isCurrent
      ? { label: t("countdown.badgeNextWave"), className: "bg-emerald-100 text-emerald-800" }
      : { label: t("countdown.badgeUpcoming"), className: "bg-slate-100 text-slate-600" };

  const statusMessage = passed
    ? t("countdown.adminSanctionsRisk")
    : isCurrent
      ? t("countdown.planAhead")
      : t("countdown.upcomingWaveHint");

  const statusClass = passed ? "text-amber-700" : isCurrent ? "text-emerald-700" : "text-slate-600";

  const ctaLine = passed ? (
    t("countdown.engageNow")
  ) : (
    <>
      {t("countdown.daysLeftPrefix")}{" "}
      <span className="text-solar">{days}</span> {t("countdown.daysLeftSuffix")}
    </>
  );

  return (
    <article className="aper-calendar-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-900">
            {waveMeta.year}
          </span>
          <span className="text-sm font-medium uppercase tracking-wider text-slate-500">
            {waveMeta.month}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}
        >
          {passed ? <span aria-hidden>⚠️</span> : isCurrent ? <span aria-hidden>🕒</span> : null}
          {badge.label}
        </span>
      </div>

      <p className="mt-5 text-lg font-bold text-slate-900">{waveMeta.surface}</p>
      <p className="mt-1 text-sm text-slate-600">{waveMeta.date}</p>
      <p className={`mt-3 text-sm font-medium ${statusClass}`}>
        {passed ? <span aria-hidden>⚠️ </span> : isCurrent ? <span aria-hidden>🕒 </span> : null}
        {statusMessage}
      </p>

      <p className="mt-4 text-sm text-slate-700">
        <span className="text-slate-500">{t("countdown.fineLabel")}</span>{" "}
        {fmt(t("countdown.fineCap"), { amount: fineAmountLabel(waveMeta.fine) })}
      </p>

      <p className="mt-6 text-center text-base font-bold leading-snug text-slate-900">{ctaLine}</p>

      {isLarge ? (
        <Link href="/appels-offres/nouveau" className="btn-solar mt-5 w-full justify-center">
          {t("countdown.ctaDeposit")}
        </Link>
      ) : (
        <OwnerPersonaHomeLink href="/" className="btn-solar mt-5 w-full justify-center">
          {t("countdown.ctaPrepare")}
        </OwnerPersonaHomeLink>
      )}

      <p className="mt-4 text-right text-xs text-slate-400">{t("countdown.lawTag")}</p>
    </article>
  );
}

export default function RegulatoryCountdown({
  variant = "full",
  targetDate,
  wave,
  obligation = "50",
  theme = "light",
}: CountdownProps) {
  const t = useTranslations();
  const now = useLiveNow();

  const target = resolveTarget(wave, obligation, targetDate);
  const progress = countdownProgress(APER_LAW_START, target, now);
  const days = daysUntil(target, now);
  const dark = theme === "dark";
  const waveMeta = wave ? getAperDeadlineWave(wave) : null;
  const waveStatus = wave ? getAperWaveStatus(wave, now) : null;

  if (variant === "timeline" && wave) {
    return <AperCalendarCard wave={wave} now={now} />;
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
          {days > 0 ? fmt(t("countdown.daysLeft"), { days }) : t("countdown.deadlineReached")}
        </p>
        <p className="mt-1 text-xs text-slate-500">{t("countdown.sinceLaw")}</p>
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
          <span>
            {days > 0 ? fmt(t("countdown.daysLeftShort"), { days }) : t("countdown.deadlineReached")}
          </span>
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
            {waveStatus === "current" ? ` · ${t("countdown.badgeNextWave")}` : null}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {t("countdown.maxFine")} {waveMeta.fine}
          </p>
        </div>
      ) : obligation === "40" ? (
        <p className="mb-4 text-xs text-slate-500">{t("countdown.obligation40")}</p>
      ) : (
        <p className="mb-4 text-xs text-slate-500">{t("countdown.obligation50")}</p>
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
        {days > 0 ? fmt(t("countdown.daysLeft"), { days }) : t("countdown.deadlineReached")}
      </p>
      <p className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-slate-500"}`}>
        {t("countdown.sinceLaw")}
      </p>
      <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-600"}`}>
        ({dateLabel})
      </p>
    </div>
  );
}
