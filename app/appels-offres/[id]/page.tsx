import RfpDetailClient from "./RfpDetailClient";

export const dynamic = "force-dynamic";

export default function RfpDetailPage({ params }: { params: { id: string } }) {
  return <RfpDetailClient id={params.id} />;
}
