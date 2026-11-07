import BrandLogo from "@/components/BrandLogo";
import { brandCopy } from "@/lib/brand-copy";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText, Settings, User, PenTool } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-context";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!active) return;
        if (res.ok) {
          const j = await res.json().catch(() => null);
          setUser(j?.user ?? null);
        } else {
          setUser(null);
        }
      } catch { setUser(null); }
    })();
    return () => { active = false; };
  }, []);

  async function handleLogout(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
      if (res.ok) {
        const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "https://facturio.ch";
        window.location.href = marketingUrl;
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  const items = [
    { href: "/", label: t("nav.dashboard"), icon: Home },
    { href: "/invoices", label: t("nav.invoices"), icon: FileText },
    { href: "/contacts", label: t("nav.customers"), icon: Users },
    { href: "/signing", label: brandCopy(lang, "signDocuments"), icon: PenTool },
  ];
  const secondary = [
    { href: "/profile", label: t("nav.myDetails"), icon: User },
  ];
  const settingsItem = { href: "/settings", label: t("nav.settings"), icon: Settings };

  function Item({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={cx(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
        <span className="font-medium">{label}</span>
      </Link>
    );
  }

  return (
    <div className={cx("flex flex-col", isMobile ? "h-full" : "h-svh")}>
      <div className="flex items-center gap-3 px-2 py-1.5 mb-4 shrink-0">
        <BrandLogo/>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {items.map((it) => (
          <Item key={it.href} {...it} />
        ))}
      </nav>

      <nav className="space-y-1 mt-1 shrink-0">
        {secondary.map((it) => (
          <Item key={it.href} {...it} />
        ))}
      </nav>

      <div className="mt-auto pt-4 space-y-1 border-t border-sidebar-border shrink-0">
        <Item {...settingsItem} />
        {user ? (
          <form onSubmit={handleLogout}>
            <button
              type="submit"
              className={cx(
                "w-full text-left group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "font-medium"
              )}
            >
              {t("nav.logout")}
            </button>
          </form>
        ) : (
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/login">{t("nav.signIn")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
