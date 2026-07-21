import { buildPageMetadata } from "@/lib/seo-config";
import VerifierClient from "./VerifierClient";
import VerifierPageShell from "./VerifierPageShell";

export const metadata = buildPageMetadata({
  title: "Vérifier l'éligibilité APER de mon parking",
  description:
    "Vérifiez gratuitement si votre parking est concerné par l'obligation de solarisation APER : surface, échéance, amende et dérogations potentielles.",
  path: "/verifier",
  keywords: [
    "vérifier éligibilité APER",
    "parking loi APER",
    "obligation ombrières parking",
    "surface parking APER",
  ],
});

export default function VerifierPage() {
  return (
    <VerifierPageShell>
      <VerifierClient />
    </VerifierPageShell>
  );
}
