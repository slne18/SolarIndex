"use client";

import { useEffect, useState } from "react";
import HomeChooserLink from "@/components/HomeChooserLink";
import { FAQ_IDS } from "@/lib/i18n/faq-ids";
import { useLocale, useTranslations } from "@/components/LocaleProvider";
import type { FaqPublishedView } from "@/lib/faq-db";
import type { MessageKey } from "@/lib/i18n";

interface FaqPageClientProps {
  publishedItems: FaqPublishedView[];
}

export default function FaqPageClient({ publishedItems: initialPublished }: FaqPageClientProps) {
  const { locale } = useLocale();
  const t = useTranslations();
  const [publishedItems, setPublishedItems] = useState(initialPublished);
  const [openId, setOpenId] = useState<string | null>(FAQ_IDS[0] ?? publishedItems[0]?.id ?? null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const staticItems = FAQ_IDS.map((id) => ({
    id,
    question: t(`faq.${id}.q` as MessageKey),
    answer: t(`faq.${id}.a` as MessageKey),
  }));

  const items = [...staticItems, ...publishedItems];

  const canSend = customQuestion.trim().length >= 10 && !sending;

  useEffect(() => {
    let cancelled = false;
    async function loadPublished() {
      try {
        const res = await fetch(`/api/faq?locale=${locale}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { entries?: FaqPublishedView[] };
        if (!cancelled && body.entries) setPublishedItems(body.entries);
      } catch {
        /* ignore — garde les entrées SSR */
      }
    }
    void loadPublished();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    setSending(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: customQuestion.trim(),
          email: senderEmail.trim() || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        throw new Error(body.error || t("faq.sendError"));
      }
      setSent(true);
      setCustomQuestion("");
      setSenderEmail("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("faq.sendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="surface-light min-h-[60vh] py-14 sm:py-20">
      <div className="container-x mx-auto max-w-3xl">
        <HomeChooserLink href="/" className="text-sm text-slate-500 transition hover:text-slate-800">
          {t("common.backHome")}
        </HomeChooserLink>
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

        <form
          className="mt-12 rounded-2xl border border-solar/25 bg-solar/5 p-6"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold text-slate-900">{t("faq.askTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("faq.askLead")}</p>

          {sent ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {t("faq.sendSuccess")}
            </p>
          ) : null}

          <label className="mt-4 block">
            <span className="sr-only">{t("faq.questionLabel")}</span>
            <textarea
              value={customQuestion}
              onChange={(e) => {
                setCustomQuestion(e.target.value);
                setSent(false);
              }}
              rows={4}
              className="input w-full !border-slate-200 !bg-white !text-slate-900 placeholder:!text-slate-400"
              placeholder={t("faq.questionPlaceholder")}
              disabled={sending}
            />
          </label>

          <label className="mt-3 block">
            <span className="text-sm text-slate-600">{t("faq.emailLabel")}</span>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="input mt-1 w-full !border-slate-200 !bg-white !text-slate-900 placeholder:!text-slate-400"
              placeholder={t("faq.emailPlaceholder")}
              autoComplete="email"
              disabled={sending}
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className={`btn-solar ${canSend ? "" : "opacity-50"}`} disabled={!canSend}>
              {sending ? t("faq.sending") : t("faq.send")}
            </button>
            {!canSend && !sending ? (
              <span className="text-xs text-slate-500">{t("faq.minChars")}</span>
            ) : null}
          </div>

          {submitError ? (
            <p className="mt-3 text-sm text-red-600">{submitError}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
