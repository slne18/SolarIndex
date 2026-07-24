import Link from "next/link";
import SuccessAnalytics from "@/components/SuccessAnalytics";
import SuccessFulfillment from "@/components/SuccessFulfillment";

export const dynamic = "force-dynamic";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { subscription?: string; pack?: string; session_id?: string; rfp?: string };
}) {
  const packWelcome =
    searchParams.pack === "welcome" || searchParams.subscription === "welcome";
  const redeemed =
    searchParams.subscription === "1" || searchParams.pack === "1";
  const rfpPurchase = searchParams.rfp === "1";

  const analyticsSource = packWelcome
    ? "pack_welcome"
    : redeemed
      ? "pack_redeem"
      : "stripe";

  return (
    <div className="container-x py-24">
      <SuccessAnalytics source={analyticsSource as "pack_welcome" | "pack_redeem" | "stripe"} />
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/20 text-3xl text-accent">
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          {packWelcome ? "Pack Territoire activé" : "Merci pour votre achat"}
        </h1>
        <p className="mt-3 text-slate-400">
          {packWelcome ? (
            <>
              Votre pack est prêt : <strong className="text-white">10 crédits leads</strong>{" "}
              à utiliser quand vous voulez. Choisissez un lead disponible dans le catalogue.
            </>
          ) : redeemed ? (
            <>
              Votre lead a été débloqué via votre Pack Territoire. Retrouvez la fiche complète
              dans votre espace client.
            </>
          ) : rfpPurchase ? (
            <>
              L&apos;accès à l&apos;appel d&apos;offres est débloqué. Les coordonnées du déposant sont
              dans <strong className="text-white">Mon espace</strong> et vous seront envoyées par email
              si la messagerie est configurée.
            </>
          ) : (
            <>
              Votre lead a été débloqué. Retrouvez-le dans votre espace et par email.
            </>
          )}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/mon-espace" className="btn-solar">Voir mon espace</Link>
          {rfpPurchase ? (
            <Link href="/appels-offres" className="btn-ghost">Appels d&apos;offres</Link>
          ) : (
            <Link href="/leads" className="btn-ghost">Parcourir les leads</Link>
          )}
        </div>
        {!redeemed && !packWelcome && (
          <>
            <SuccessFulfillment sessionId={searchParams.session_id} />
            <p className="mt-6 text-xs text-slate-500">
              Confirmation Stripe · livraison automatique (webhook + secours sur cette page).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
