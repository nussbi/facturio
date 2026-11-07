"use client";

import BrandLogo from "@/components/BrandLogo";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-context";

export default function ResetPageInner() {
  const { t } = useLanguage();
  const sp = useSearchParams();
  const token = sp.get("token");
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function requestReset() {
    setMsg(null);
    setErr(null);
    const res = await fetch("/app/api/auth/reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setMsg(t("reset.msgRequest"));
    } else {
      setErr(t("reset.errGeneric"));
    }
  }

  async function confirmReset() {
    setMsg(null);
    setErr(null);
    if (!pw1 || pw1 !== pw2) {
      setErr(t("reset.errMismatch"));
      return;
    }
    const res = await fetch("/app/api/auth/reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: pw1 }),
    });
    if (res.ok) {
      setMsg(t("reset.msgUpdated"));
    } else {
      const j = await res.json().catch(() => ({}));
      setErr((j as { error?: string }).error || t("reset.errToken"));
    }
  }

  return (
    <div className="min-h-screen w-full bg-white grid md:grid-cols-2">
      {/* Left brand panel (desktop) */}
      <div className="hidden md:block relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] [background:radial-gradient(700px_400px_at_30%_-10%,#60a5fa,transparent_60%),radial-gradient(700px_400px_at_80%_20%,#22d3ee,transparent_55%),radial-gradient(600px_400px_at_70%_110%,#6366f1,transparent_55%)]" />
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_90%)] bg-[radial-gradient(1px_1px_at_24px_24px,#e5e7eb_1px,transparent_0)] [background-size:48px_48px]" />
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="max-w-md">
            <div className="mb-6">
              <BrandLogo href="https://facturio.ch"/>
            </div>
            <h2 className="text-4xl font-semibold leading-tight text-gray-900">{t("reset.title")}</h2>
            <p className="mt-5 text-gray-600">{t("reset.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Right reset card */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:hidden">
            <div className="mb-6">
              <BrandLogo href="https://facturio.ch"/>
            </div>
            <h1 className="text-2xl font-semibold">{t("reset.heading")}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t("reset.subheading")}</p>
          </div>

      {!token ? (
        <Card className="rounded-xl border bg-card text-card-foreground shadow-xl">
          <CardHeader>
            <CardTitle>{t("reset.requestTitle")}</CardTitle>
            <CardDescription>{t("reset.requestDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("reset.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button className="w-full" disabled={pending} onClick={() => start(requestReset)}>
              {t("reset.sendLink")}
            </Button>
            {msg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{msg}</p>
              </div>
            )}
            {err && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{err}</p>
              </div>
            )}
            </CardContent>
          </Card>
      ) : (
          <Card className="rounded-xl border bg-card text-card-foreground shadow-xl">
          <CardHeader>
            <CardTitle>{t("reset.setNewTitle")}</CardTitle>
            <CardDescription>{t("reset.setNewDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password1">{t("reset.newPassword")}</Label>
              <Input
                id="password1"
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder={t("reset.newPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">{t("reset.confirmPassword")}</Label>
              <Input
                id="password2"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder={t("reset.confirmPassword")}
              />
            </div>
            <Button className="w-full" disabled={pending} onClick={() => start(confirmReset)}>
              {t("reset.setNewButton")}
            </Button>
            {msg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{msg}</p>
              </div>
            )}
            {err && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{err}</p>
              </div>
            )}
            </CardContent>
          </Card>
      )}
          <div className="mt-6 text-center text-xs text-gray-500">
            {t("reset.remember")} <a className="underline" href="/login">{t("reset.rememberLink")}</a>{t("reset.rememberEnd")}
          </div>
        </div>
      </div>
    </div>
  );
}
