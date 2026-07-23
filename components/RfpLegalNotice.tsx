import Link from "next/link";
import {
  RFP_INSTALLER_NOTICE,
  RFP_LEGAL_LABEL,
  RFP_SERVICE_SUMMARY,
  RFP_TOOLS_DISCLAIMER,
} from "@/lib/rfp-legal";

type Variant = "compact" | "catalog" | "installer" | "deposant";

export default function RfpLegalNotice({ variant = "compact" }: { variant?: Variant }) {
  if (variant === "installer") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950/85">
        <p className="font-semibold text-amber-950">Information installateur</p>
        <p className="mt-2">{RFP_INSTALLER_NOTICE}</p>
      </div>
    );
  }

  if (variant === "deposant") {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-400">
        <p className="font-semibold text-slate-200">{RFP_LEGAL_LABEL}</p>
        <p className="mt-2">{RFP_SERVICE_SUMMARY}</p>
        <p className="mt-2">{RFP_TOOLS_DISCLAIMER}</p>
        <p className="mt-2">
          <Link href="/legal/cgu" className="text-solar hover:underline">
            CGU déposants
          </Link>
          {" · "}
          <Link href="/legal/confidentialite" className="text-solar hover:underline">
            Confidentialité
          </Link>
        </p>
      </div>
    );
  }

  if (variant === "catalog") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        <p className="font-semibold text-slate-800">{RFP_LEGAL_LABEL}</p>
        <p className="mt-2">
          Projets déposés volontairement par des acteurs privés. Ce service ne remplace pas une
          procédure de marché public. {RFP_TOOLS_DISCLAIMER}
        </p>
        <p className="mt-2">
          <Link href="/legal/cgu" className="text-solar-600 hover:underline">
            En savoir plus (CGU)
          </Link>
        </p>
      </div>
    );
  }

  return (
    <p className="text-xs leading-relaxed text-slate-500">
      {RFP_LEGAL_LABEL}. {RFP_TOOLS_DISCLAIMER}{" "}
      <Link href="/legal/cgu" className="text-solar-600 hover:underline">
        CGU
      </Link>
    </p>
  );
}
