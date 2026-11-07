"use client";

import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/language-context";
import { brandCopy } from "@/lib/brand-copy";

export default function BrandFooter({ publicBase = "https://facturio.ch", appBase = "https://app.facturio.ch", signBase = "https://sign.facturio.ch" }: { publicBase?: string; appBase?: string; signBase?: string }) {
  const { lang } = useLanguage();
  const t = (key: Parameters<typeof brandCopy>[1]) => brandCopy(lang, key);
  const home = `${publicBase}${lang === "en" ? "/" : `/${lang}/`}`;
  return <footer className="f-footer">
    <div className="f-footer-grid">
      <div><BrandLogo href={home}/><p>{t("footerDescription")}</p><span className="f-swiss"><span className="f-swiss-icon" aria-hidden="true">+</span>{t("swiss")}</span></div>
      <div><h3>{t("product")}</h3><nav aria-label={t("product")}><a href={`${home}#product`}>{t("overview")}</a><a href={`${home}#how`}>{t("how")}</a><a href={`${home}#pricing`}>{t("pricing")}</a><a href={`${home}#faq`}>{t("questions")}</a><a href={`${publicBase}${lang === "en" ? "/blog/" : `/${lang}/blog/`}`}>{t("blog")}</a><a href={`${publicBase}/about`}>{t("about")}</a></nav></div>
      <div><h3>{t("account")}</h3><nav aria-label={t("account")}><a href={`${appBase}/login?lang=${lang}`}>{t("login")}</a><a href={`${appBase}/login?mode=signup&lang=${lang}`}>{t("createAccount")}</a><a href={`${appBase}/reset?lang=${lang}`}>{t("reset")}</a><a href={signBase}>{t("signDocuments")}</a></nav></div>
      <div><h3>{t("legal")}</h3><nav aria-label={t("legal")}><a href={`${publicBase}/agb`}>{t("terms")}</a><a href={`${publicBase}/privacy`}>{t("privacy")}</a><a href={`${publicBase}/impressum`}>{t("imprint")}</a></nav></div>
    </div>
    <div className="f-footer-bottom"><span>© {new Date().getFullYear()} facturio.ch — {t("rights")}</span><span>Swiss QR-bill · SIX compliant</span></div>
  </footer>;
}
