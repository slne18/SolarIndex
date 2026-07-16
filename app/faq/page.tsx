import type { Metadata } from "next";
import FaqPageClient from "@/components/FaqPageClient";
import JsonLd from "@/components/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq";
import { buildPageMetadata } from "@/lib/seo-config";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: `FAQ — ${SITE_NAME}`,
  description: "Questions fréquentes sur les leads APER et consultations installateurs SolarIndex.",
  path: "/faq",
});

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <FaqPageClient />
    </>
  );
}
