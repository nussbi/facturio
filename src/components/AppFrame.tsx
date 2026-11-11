"use client";

import BrandLogo from "@/components/BrandLogo";
import BrandFooter from "@/components/BrandFooter";
import BrandPublicHeader from "@/components/BrandPublicHeader";
import Sidebar from "@/components/Sidebar";
import GlobalHeader from "@/components/GlobalHeader";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/components/language-context";
import posthog from "posthog-js";

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
};

export default function AppFrame({ children, user, publicBase = "https://facturio.ch", appBase = "https://app.facturio.ch", signBase = "https://sign.facturio.ch" }: { children: React.ReactNode; user: AuthenticatedUser | null; publicBase?: string; appBase?: string; signBase?: string }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user || identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) posthog.reset();
    posthog.identify(user.id, {
      email: user.email,
      name: user.name ?? undefined,
      role: user.role,
      plan: user.plan,
    });
    identifiedUserId.current = user.id;
  }, [user]);

  // Hide chrome (sidebar/header) on auth-related minimal pages
  // Covers both direct and rewritten paths like "/login", "/app/login", "/reset", "/app/reset"
  const minimal = pathname?.includes("/login") || pathname?.includes("/reset");

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (minimal) {
    // Allow auth pages (login/reset) to control their own layout and width
    return <div className="f-auth-page min-h-screen"><BrandPublicHeader publicBase={publicBase} appBase={appBase}/>{children}<BrandFooter publicBase={publicBase} appBase={appBase} signBase={signBase}/></div>;
  }

  return (
    <div className="f-app-frame min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground">
        <Sidebar />
      </aside>

      {/* Mobile slide-in drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground shadow-xl">
            <Sidebar isMobile={true} />
          </aside>
          <button
            onClick={() => setMenuOpen(false)}
            className="fixed top-4 right-4 z-60 p-2 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground bg-sidebar shadow-md"
            aria-label={t("common.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b bg-white/80 backdrop-blur-sm px-4 py-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-1 rounded-md text-gray-700 hover:bg-gray-100"
            aria-label={t("common.openMenu")}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1"><BrandLogo/></div>
          <LanguageSwitcher variant="dropdown" />
        </div>

        <GlobalHeader />
        <main className={`mx-auto w-full ${pathname?.includes("/signing") ? "max-w-[1600px]" : "max-w-5xl"} p-4 sm:p-6 md:p-8 flex-1`}>{children}</main>
        <BrandFooter publicBase={publicBase} appBase={appBase} signBase={signBase}/>
      </div>
    </div>
  );
}
