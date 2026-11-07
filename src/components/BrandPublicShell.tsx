import { cookies } from "next/headers";
import Providers from "@/components/Providers";
import BrandPublicHeader from "@/components/BrandPublicHeader";
import BrandFooter from "@/components/BrandFooter";
import { LANG_KEY, type Lang } from "@/lib/i18n";

export default async function BrandPublicShell({ children }: { children: React.ReactNode }) {
  const raw = (await cookies()).get(LANG_KEY)?.value;
  const initialLang: Lang = raw === "de" || raw === "fr" || raw === "it" ? raw : "en";
  const publicBase = process.env.PUBLIC_BASE_URL || "https://facturio.ch";
  const appBase = process.env.APP_BASE_URL || "https://app.facturio.ch";
  const signBase = process.env.SIGNING_BASE_URL || "https://sign.facturio.ch";
  return <Providers initialLang={initialLang}><BrandPublicHeader publicBase={publicBase} appBase={appBase}/><div className="f-public-content">{children}</div><BrandFooter publicBase={publicBase} appBase={appBase} signBase={signBase}/></Providers>;
}
