import RfpEditClient from "@/components/RfpEditClient";
import { buildPageMetadata } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Modifier votre projet parking",
  description: "Corrigez les informations de votre consultation installateurs.",
  path: "/appels-offres/modifier",
});

export default function RfpModifierPage({ params }: { params: { id: string } }) {
  return (
    <div className="surface-light min-h-[50vh]">
      <RfpEditClient id={params.id} />
    </div>
  );
}
