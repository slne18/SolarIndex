"use client";

import { useState } from "react";
import { useTranslations } from "@/components/LocaleProvider";

export default function FaqAskForm() {
  const t = useTranslations();
  const [customQuestion, setCustomQuestion] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim());
  const canSend = customQuestion.trim().length >= 10 && emailOk && !sending;

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
          email: senderEmail.trim(),
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
    <form
      className="mt-10 rounded-2xl border border-solar/25 bg-solar/5 p-6 text-left"
      onSubmit={handleSubmit}
    >
      <h3 className="text-lg font-semibold text-slate-900">{t("faq.askTitle")}</h3>
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
          required
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

      {submitError ? <p className="mt-3 text-sm text-red-600">{submitError}</p> : null}
    </form>
  );
}
