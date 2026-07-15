import Link from "next/link";
import PackTerritoireButton from "@/components/PackTerritoireButton";
import { PRIX_LEAD } from "@/lib/leads";
import {
  TERRITOIRE_LEADS_QUOTA,
  TERRITOIRE_PACK_DISCOUNT_PCT,
  TERRITOIRE_PACK_EUR,
} from "@/lib/subscription";
import { buildPageMetadata } from "@/lib/seo-config";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Pack Territoire — 5 leads parking APER",
  description:
    "Achetez 5 crédits leads Standard ou Premium en un pack. Prospection B2B parkings non conformes loi APER, France entière.",
  path: "/pack-territoire",
});

export default function PackTerritoirePage() {
  return (
    <div className="container-x py-16">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">← Accueil</Link>

      <div className="relative mx-auto mt-8 max-w-xl pt-8">
        <span className="absolute left-0 top-0 rounded-full bg-solar px-2.5 py-1 text-xs font-bold text-night">
          −{TERRITOIRE_PACK_DISCOUNT_PCT} %
        </span>
        <span className="pill">Pack Territoire</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {TERRITOIRE_LEADS_QUOTA} leads — achat unique
        </h1>
        <p className="mt-3 text-slate-400">
          Pack ponctuel à <strong className="text-white">{TERRITOIRE_PACK_EUR} €</strong>.
          Chaque crédit = 1 lead débloqué instantanément, partout en France — sans verrouillage
          départemental. Pas d&apos;abonnement.
        </p>

        <ul className="mt-8 space-y-3 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            {TERRITOIRE_LEADS_QUOTA} crédits leads inclus
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            Standard ({PRIX_LEAD.standard} €) ou Premium ({PRIX_LEAD.premium} €) — vous choisissez
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            France entière — aucun plafond mensuel
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            Fiche B2B complète + email de livraison
          </li>
          <li className="flex gap-2">
            <span className="text-solar">✓</span>
            Crédits à utiliser à votre rythme — pas de renouvellement automatique
          </li>
        </ul>

        <div className="card mt-10 p-6">
          <PackTerritoireButton />
          <p className="mt-4 text-center text-xs text-slate-500">
            Paiement unique Stripe · Pas de prélèvement récurrent.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Vous préférez acheter à l&apos;unité ?{" "}
          <Link href="/leads" className="text-solar underline">Parcourir le catalogue</Link>
        </p>
      </div>
    </div>
  );
}
