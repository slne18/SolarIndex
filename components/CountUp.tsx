"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
}

export default function CountUp({ to, durationMs = 1400, prefix = "", suffix = "" }: CountUpProps) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, durationMs]);

  return (
    <span>
      {prefix}
      {value.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}
