import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getManagedSigningEnvelope } from "@/server/signing-access";
import StandaloneSend from "@/components/StandaloneSend";
export const dynamic = "force-dynamic";
export const metadata = { title: "Send for signature · Facturio", robots: { index: false, follow: false } };
export default async function SendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const envelope = await getManagedSigningEnvelope(id);
  if (!envelope) notFound();
  return <StandaloneSend id={id} title={envelope.title} initialEmail={envelope.recipientEmail} initialStatus={envelope.status} guest={!await getCurrentUser()} appBase={process.env.APP_BASE_URL || "https://app.facturio.ch"} />;
}
