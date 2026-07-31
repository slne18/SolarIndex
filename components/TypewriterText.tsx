"use client";

import { useEffect, useState } from "react";

function delayForChar(char: string, baseMs: number): number {
  if (char === "." || char === "!" || char === "?") return baseMs * 5;
  if (char === "," || char === ";" || char === ":") return baseMs * 2.5;
  if (char === " ") return baseMs * 0.6;
  return baseMs;
}

export default function TypewriterText({
  text,
  className = "",
  charDelayMs = 26,
  startDelayMs = 850,
}: {
  text: string;
  className?: string;
  charDelayMs?: number;
  startDelayMs?: number;
}) {
  const [displayed, setDisplayed] = useState("");
  const [motionOk, setMotionOk] = useState(true);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const clear = () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };

    if (!motionOk) {
      setDisplayed(text);
      setDone(true);
      return clear;
    }

    setDisplayed("");
    setDone(false);

    let index = 0;

    const typeNext = () => {
      if (cancelled || index >= text.length) {
        if (!cancelled) setDone(true);
        return;
      }

      index += 1;
      setDisplayed(text.slice(0, index));
      timeoutId = setTimeout(typeNext, delayForChar(text[index - 1] ?? "", charDelayMs));
    };

    timeoutId = setTimeout(typeNext, startDelayMs);
    return clear;
  }, [text, motionOk, charDelayMs, startDelayMs, mounted]);

  return (
    <p className={className} aria-label={text}>
      {mounted ? displayed : ""}
      {mounted && !done && motionOk ? (
        <span className="typewriter-cursor" aria-hidden>
          |
        </span>
      ) : null}
    </p>
  );
}
