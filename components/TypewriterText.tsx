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
  startDelayMs = 500,
}: {
  text: string;
  className?: string;
  charDelayMs?: number;
  startDelayMs?: number;
}) {
  const [displayed, setDisplayed] = useState("");
  const [motionOk, setMotionOk] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!motionOk) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);

    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeNext = () => {
      if (index >= text.length) {
        setDone(true);
        return;
      }

      index += 1;
      setDisplayed(text.slice(0, index));
      timeoutId = setTimeout(typeNext, delayForChar(text[index - 1] ?? "", charDelayMs));
    };

    timeoutId = setTimeout(typeNext, startDelayMs);
    return () => clearTimeout(timeoutId);
  }, [text, motionOk, charDelayMs, startDelayMs]);

  return (
    <p className={className} aria-label={text}>
      {displayed}
      {!done && motionOk ? (
        <span className="typewriter-cursor" aria-hidden>
          |
        </span>
      ) : null}
    </p>
  );
}
