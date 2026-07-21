import PackTerritoirePageClient from "./PackTerritoirePageClient";
import { buildPageMetadata } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Pack Territoire — 5 leads parking APER",
  description:
    "Achetez 5 crédits leads Standard ou Premium en un pack. Prospection B2B parkings non conformes loi APER, France entière.",
  path: "/pack-territoire",
});

export default function PackTerritoirePage() {
  return <PackTerritoirePageClient />;
}
