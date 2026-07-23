"use client";

import { useState } from "react";
import Link from "next/link";
import { FAQ_IDS } from "@/lib/i18n/faq-ids";
import { faqQuestionMailto } from "@/lib/site";
import { useTranslations } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

export default function FaqPageClient() {
  const t = useTranslations();
  const [openId, setOpenId] = useState<string | null>(FAQ_IDS[0] ?? null);
  const [customQuestion, setCustomQuestion] = useState("");

  const items = FAQ_IDS.map((id) => ({
    id,
    question: t(`faq.${id}.q` as MessageKey),
    answer: t(`faq.${id}.a` as MessageKey),
  }));

  const canSend = customQuestion.trim().length >= 10;

  return (
    <div className="surface-light min-h-[60vh] py-14 sm:py-20">
      <div className="container-x mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-800">
          {t("common.backHome")}
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("faq.title")}
        </h1>
        <p className="mt-3 text-slate-600">{t("faq.lead")}</p>

        <div className="mt-10 space-y-3">
          {items.map((item) => {
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
          <h2 className="text-lg font-semibold text-slate-900">{t("faq.askTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("faq.askLead")}</p>
          <label className="mt-4 block">
            <span className="sr-only">{t("faq.questionLabel")}</span>
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              rows={4}
              className="input w-full !border-slate-200 !bg-white !text-slate-900 placeholder:!text-slate-400"
              placeholder={t("faq.questionPlaceholder")}
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={canSend ? faqQuestionMailto(customQuestion) : undefined}
              className={`btn-solar ${canSend ? "" : "pointer-events-none opacity-50"}`}
              aria-disabled={!canSend}
            >
              {t("faq.send")}
            </a>
            {!canSend ? (
              <span className="text-xs text-slate-500">{t("faq.minChars")}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
