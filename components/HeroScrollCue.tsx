"use client";

export default function HeroScrollCue({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-auto flex justify-center pb-8 pt-4 sm:pb-10">
      <a
        href={href}
        className="group flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-widest text-white/[0.85] transition hover:text-white"
      >
        {label}
        <svg
          className="mt-1 h-4 w-4 animate-bounce text-white/70 group-hover:text-solar"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
