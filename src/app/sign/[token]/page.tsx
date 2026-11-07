import type { Metadata } from "next";
import SignDocument from "@/components/SignDocument";
export const metadata: Metadata = { title: "Review and sign · Facturio", robots: { index: false, follow: false } };
export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SignDocument token={token} />;
}
