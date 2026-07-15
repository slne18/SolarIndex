"use client";

import { useState } from "react";
import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/faq";
import { CONTACT_EMAIL, faqQuestionMailto } from "@/lib/site";

export default function FaqPageClient() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);
  const [customQuestion, setCustomQuestion] = useState("");

  const canSend = customQuestion.trim().length >= 10;

  return (
    <div className="surface-light min-h-[60vh] py-14 sm:py-20">
      <div className="container-x mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-800">
          ← Accueil
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Foire aux questions
        </h1>
        <p className="mt-3 text-slate-600">
          Réponses aux questions les plus fréquentes sur SolarIndex — leads APER et appels
          d&apos;offres solaires.
        </p>

        <div className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item) => {
            const open = openId === item.id;
            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <span className="font-semibold text-slate-900">{item.question}</span>
                  <span className="mt-0.5 shrink-0 text-solar" aria-hidden>
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-sm leading-relaxed text-slate-600">
                    {item.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-solar/25 bg-solar/5 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Posez votre question</h2>
          <p className="mt-2 text-sm text-slate-600">
            Vous ne trouvez pas la réponse ? Décrivez votre question ci-dessous — nous l&apos;ajouterons
            à la FAQ si elle est utile à tous.
          </p>
          <label className="mt-4 block">
            <span className="sr-only">Votre question</span>
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              rows={4}
              className="input w-full !border-slate-200 !bg-white !text-slate-900 placeholder:!text-slate-400"
              placeholder="Ex. : Puis-je filtrer les leads par département avant achat ?"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={canSend ? faqQuestionMailto(customQuestion) : undefined}
              className={`btn-solar ${canSend ? "" : "pointer-events-none opacity-50"}`}
              aria-disabled={!canSend}
            >
              Envoyer ma question
            </a>
            <span className="text-xs text-slate-500">
              → {CONTACT_EMAIL}
              {!canSend ? " · 10 caractères minimum" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
