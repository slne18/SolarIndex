import { buildPageMetadata } from "@/lib/seo-config";
import VerifierClient from "./VerifierClient";
import VerifierPageShell, { VerifierPageContent } from "./VerifierPageShell";

export const metadata = buildPageMetadata({
  title: "Mon parking est-il concerné par l'obligation APER ?",
  description:
    "Vérifiez gratuitement si votre parking est concerné par l'obligation de solarisation APER : surface, échéance, amende et dérogations potentielles.",
  path: "/verifier",
  keywords: [
    "parking concerné APER",
    "parking loi APER",
    "obligation ombrières parking",
    "surface parking APER",
  ],
});

export default function VerifierPage() {
  return (
    <>
      <div className="hero-surface hero-surface-compact">
        <VerifierPageShell />
      </div>
      <div className="surface-light border-t border-slate-100">
        <div className="container-x owner-tool-page py-10 sm:py-14">
          <VerifierPageContent>
            <VerifierClient />
          </VerifierPageContent>
        </div>
      </div>
    </>
  );
}
