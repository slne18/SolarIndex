import type { Metadata } from "next";
import FaqPageClient from "@/components/FaqPageClient";
import JsonLd from "@/components/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq";
import { queryPublishedFaqEntries } from "@/lib/faq-db";
import { buildPageMetadata } from "@/lib/seo-config";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: `FAQ — ${SITE_NAME}`,
  description: "Questions fréquentes sur les leads APER et consultations installateurs SolarIndex.",
  path: "/faq",
});

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  let publishedItems: Awaited<ReturnType<typeof queryPublishedFaqEntries>> = [];
  try {
    publishedItems = await queryPublishedFaqEntries("fr");
  } catch (e) {
    console.error("[faq/page] published entries:", e);
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ...FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
      ...publishedItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    ],
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <FaqPageClient publishedItems={publishedItems} />
    </>
  );
}
