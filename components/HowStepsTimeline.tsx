"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { MessageKey } from "@/lib/i18n";

const ROTATE_MS = 3_500;

export type HowStep = {
  href: string;
  labelKey: MessageKey;
  match?: (path: string) => boolean;
};

export default function HowStepsTimeline({
  steps,
  t,
}: {
  steps: HowStep[];
  t: (key: MessageKey) => string;
}) {
  const pathname = usePathname() ?? "";
  const [autoIndex, setAutoIndex] = useState(0);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionOk(!mq.matches);
    const onChange = () => setMotionOk(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!motionOk) return;
    const id = window.setInterval(() => {
      setAutoIndex((index) => (index + 1) % steps.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [motionOk, steps.length]);

  const pathIndex = steps.findIndex((step) => step.match?.(pathname));
  const activeIndex = pathIndex >= 0 ? pathIndex : autoIndex;
  const progressPct = steps.length <= 1 ? 0 : (activeIndex / (steps.length - 1)) * 100;

  return (
    <div className="owner-how-steps-wrap mx-auto mt-12 max-w-5xl">
      <div className="owner-how-progress-rail hidden lg:block" aria-hidden>
        <span className="owner-how-progress-track" />
        <span className="owner-how-progress-fill" style={{ width: `${progressPct}%` }} />
        <span className="owner-how-progress-traveler" style={{ left: `${progressPct}%` }} />
      </div>

      <ol className="owner-how-steps">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const passed = index < activeIndex;

          return (
            <li key={step.href} className="owner-how-step">
              <Link
                href={step.href}
                className={`owner-how-step-link group${active ? " owner-how-step-link-active" : ""}`}
                aria-current={active ? "step" : undefined}
                onFocus={() => setAutoIndex(index)}
              >
                <span className="owner-how-step-track" aria-hidden>
                  <span
                    className={`owner-how-step-dot${active ? " owner-how-step-dot-active" : ""}${passed ? " owner-how-step-dot-passed" : ""}`}
                  >
                    {index + 1}
                  </span>
                </span>
                <span className={`owner-how-step-label${active ? " owner-how-step-label-active" : ""}`}>
                  {t(step.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
