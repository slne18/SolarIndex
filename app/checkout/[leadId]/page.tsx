import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default function CheckoutPage({ params }: { params: { leadId: string } }) {
  return <CheckoutClient leadId={params.leadId} />;
}
