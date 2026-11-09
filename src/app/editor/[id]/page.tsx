import { notFound } from "next/navigation";
import { getManagedSigningEnvelope } from "@/server/signing-access";
import StandaloneEditor from "@/components/StandaloneEditor";
export const dynamic = "force-dynamic";
export const metadata = { title: "PDF editor · Facturio", robots: { index: false, follow: false } };
export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const envelope = await getManagedSigningEnvelope(id);
  if (!envelope) notFound();
  let fields;
  try { fields = JSON.parse(envelope.fieldsJson); } catch { notFound(); }
  return <StandaloneEditor id={id} title={envelope.title} fields={fields} editable={envelope.status === "DRAFT"} />;
}
