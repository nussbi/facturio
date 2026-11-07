import { cookies } from "next/headers";
import { t, LANG_KEY, type Lang } from "@/lib/i18n";

export async function getServerT() {
  const raw = (await cookies()).get(LANG_KEY)?.value;
  const lang: Lang = raw === "de" || raw === "fr" || raw === "it" ? raw : "en";
  return (key: string) => t(lang, key);
}
