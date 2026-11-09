"use client";
import { useLanguage } from "@/components/language-context";
const { signingCopy } = require("@/lib/signing-copy.cjs");
export function useSigningT() {
  const { lang } = useLanguage();
  return (key: string, values?: Record<string, string | number>): string => signingCopy(lang, key, values);
}
