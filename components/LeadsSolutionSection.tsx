"use client";

import SectionEyebrow from "@/components/SectionEyebrow";
import SolutionStats from "@/components/SolutionStats";
import { useTranslations } from "@/components/LocaleProvider";

function ProcessStep({
  n,
  title,
  text,
  tag,
}: {
  n: string;
  title: string;
  text: string;
  tag: string;
}) {
  return (
    <li className="solution-process-item">
      <span className="solution-process-num" aria-hidden>
        {n}
      </span>
      <p className="solution-process-tag">{tag}</p>
      <h3 className="solution-process-title">{title}</h3>
      <p className="solution-process-text">{text}</p>
    </li>
  );
}

export default function LeadsSolutionSection() {
  const t = useTranslations();

  return (
    <section id="solution" className="solution-section-panel pb-4 sm:pb-6">
      <SectionEyebrow>{t("solution.eyebrow")}</SectionEyebrow>
      <h2 className="section-subtitle mt-3">{t("solution.title")}</h2>
      <p className="section-lead mt-4">{t("solution.lead")}</p>

      <SolutionStats />

      <ol className="solution-process-list" aria-label={t("solution.stepsAria")}>
        <ProcessStep
          n="01"
          title={t("solution.step1.title")}
          text={t("solution.step1.text")}
          tag={t("solution.step1.tag")}
        />
        <ProcessStep
          n="02"
          title={t("solution.step2.title")}
          text={t("solution.step2.text")}
          tag={t("solution.step2.tag")}
        />
        <ProcessStep
          n="03"
          title={t("solution.step3.title")}
          text={t("solution.step3.text")}
          tag={t("solution.step3.tag")}
        />
      </ol>
    </section>
  );
}
