"use client";

import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/language-context";
import { brandCopy } from "@/lib/brand-copy";

export default function BrandPublicHeader({ publicBase = "https://facturio.ch", appBase = "https://app.facturio.ch" }: { publicBase?: string; appBase?: string }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const t = (key: Parameters<typeof brandCopy>[1]) => brandCopy(lang, key);
  const home = `${publicBase}${lang === "en" ? "/" : `/${lang}/`}`;
  const nav = [{ href: `${home}#product`, label: t("product") }, { href: `${home}#how`, label: t("how") }, { href: `${home}#pricing`, label: t("pricing") }, { href: `${publicBase}${lang === "en" ? "/blog/" : `/${lang}/blog/`}`, label: t("blog") }];
  return <header className="f-header">
    <div className="f-nav"><BrandLogo href={home}/><nav className="f-nav-links" aria-label="Main">{nav.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <div className="f-nav-actions"><LanguageSwitcher/><a className="f-login" href={`${appBase}/login?lang=${lang}`}>{t("login")}</a><a className="f-button" href={`${appBase}/login?mode=signup&lang=${lang}`}>{t("start")}<ArrowRight size={16}/></a><button type="button" className="f-mobile-trigger" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="public-mobile-nav" onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div>
    </div>
    {open && <nav id="public-mobile-nav" className="f-mobile-nav" aria-label="Mobile navigation">{nav.map(item => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}<a href={`${publicBase}/about`}>{t("about")}</a><a href={`${appBase}/login?lang=${lang}`}>{t("login")}</a></nav>}
  </header>;
}
