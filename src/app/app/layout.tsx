import type { Metadata } from "next";
import { cookies } from "next/headers";
import Providers from "@/components/Providers";
import AppFrame from "@/components/AppFrame";
import { LANG_KEY, type Lang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "facturio.ch",
  description: "Minimal, modern invoicing with Swiss QR-bill",
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const raw = (await cookies()).get(LANG_KEY)?.value;
  const initialLang: Lang = raw === "de" || raw === "fr" || raw === "it" ? raw : "en";

  return (
    <Providers initialLang={initialLang}>
      <AppFrame publicBase={process.env.PUBLIC_BASE_URL} appBase={process.env.APP_BASE_URL} signBase={process.env.SIGNING_BASE_URL}>{children}</AppFrame>
    </Providers>
  );
}
