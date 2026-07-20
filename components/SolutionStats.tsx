"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "@/components/LocaleProvider";

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

function Metric({
  value,
  suffix,
  title,
  detail,
  note,
  locale,
}: {
  value: number;
  suffix: string;
  title: string;
  detail: string;
  note?: string;
  locale: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const animated = useCountUp(value, inView);

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
    <div ref={ref} className="solution-metric">
      <p className="solution-metric-title">{title}</p>
      <p className="solution-metric-value">
        <span>{animated.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}</span>
        <span className="solution-metric-suffix">{suffix}</span>
      </p>
      <p className="solution-metric-detail">{detail}</p>
      {note ? <p className="solution-metric-note">{note}</p> : null}
    </div>
  );
}

export default function SolutionStats() {
  const t = useTranslations();
  const { locale } = useLocale();

  return (
    <div className="solution-metrics-ribbon mt-8" aria-label={t("solution.metricsAria")}>
      <Metric
        value={ELIGIBLE_PARKINGS}
        suffix="+"
        title={t("solution.metric1.title")}
        detail={t("solution.metric1.detail")}
        locale={locale}
      />
      <div className="solution-metrics-divider" aria-hidden />
      <Metric
        value={MARKET_VALUE_KWC_EUR}
        suffix=" €"
        title={t("solution.metric2.title")}
        detail={t("solution.metric2.detail")}
        note={t("solution.metric2.note")}
        locale={locale}
      />
    </div>
  );
}
