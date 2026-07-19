import HomeHeroPersona from "@/components/HomeHeroPersona";
import HomePageSections from "@/components/HomePageSections";
import JsonLd from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo-config";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = buildPageMetadata({
  title: "SolarIndex — Leads parkings APER & appels d'offres solaires",
  description:
    "Repérez les parkings non conformes à la loi APER avant l'amende. Leads B2B automatisés et appels d'offres déposés par les gérants pour installateurs photovoltaïques.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
            description:
              "Index de parkings non conformes APER et marketplace d'appels d'offres pour installateurs solaires.",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            inLanguage: "fr-FR",
          },
        ]}
      />
      <HomeHeroPersona />
      <HomePageSections />
    </>
  );
}
