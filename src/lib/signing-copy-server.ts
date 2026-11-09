import { cookies } from "next/headers";
import { LANG_KEY, type Lang } from "@/lib/i18n";
const { signingCopy } = require("@/lib/signing-copy.cjs");
export async function getSigningLanguage(): Promise<Lang> {
  const value = (await cookies()).get(LANG_KEY)?.value;
  return value === "de" || value === "fr" || value === "it" ? value : "en";
}
export async function getSigningT() {
  const lang = await getSigningLanguage();
  return (key: string, values?: Record<string, string | number>): string => signingCopy(lang, key, values);
}
export const signingLocale = { en: "en-CH", de: "de-CH", fr: "fr-CH", it: "it-CH" };
