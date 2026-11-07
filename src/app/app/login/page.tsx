"use client";
import BrandLogo from "@/components/BrandLogo";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { type Lang } from "@/lib/i18n";
import { useLanguage } from "@/components/language-context";

export default function LoginPage() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signin');
  const [signupErrors, setSignupErrors] = useState<{ email?: string; password?: string }>({});
  const [pwdScore, setPwdScore] = useState<number>(0);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [oauthErrorCode, setOauthErrorCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Persist mode via URL (?mode=signup or ?mode=signin)
        const url = new URL(window.location.href);
        const qpMode = url.searchParams.get('mode');
        if (qpMode === 'signup') setMode('signup');
        else if (qpMode === 'signin') setMode('signin');

        // Redirect if already authenticated
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          window.location.replace('/app/onboarding');
          return;
        }
      } catch {}
    })();
  }, []);

  // Surface OAuth errors returned via ?error=...
  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get("error");
    if (code) setOauthErrorCode(code);
  }, []);

  function setModeAndUrl(next: 'signup' | 'signin') {
    setMode(next);
    setShowPwd(false);
    setSignInError(null);
    const url = new URL(window.location.href);
    if (next === 'signup') url.searchParams.set('mode', 'signup');
    else url.searchParams.delete('mode');
    window.history.replaceState({}, '', url.toString());
  }

  function validateEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function passwordScore(v: string) {
    let s = 0;
    if (v.length >= 8) s++;
    if (/[a-z]/.test(v)) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s; // 0..5
  }
  function validatePassword(v: string) {
    return passwordScore(v) >= 2; // minimal acceptable
  }

  // Localization (en, de, fr) — follows the language cookie (via Provider), consistent with the app.
  const { t, lang, setLang } = useLanguage();

  const oauthErrorMsg =
    oauthErrorCode === "oauth_unconfigured"
      ? t("login.oauthUnconfigured")
      : oauthErrorCode
        ? t("login.oauthFailed")
        : null;

  // Respect ?lang=<code> from the landing page's "Log in" link; otherwise keep the
  // cookie language (default "en"). Removed browser auto-detect — it forced Italian.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const p = new URL(window.location.href).searchParams.get("lang");
    if (p === "de" || p === "fr" || p === "it" || p === "en") {
      if (p !== lang) setLang(p as Lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native app (Capacitor): Google OAuth must run in a Chrome Custom Tab (Google
  // blocks OAuth in embedded webviews). We open it there, then hand the signed
  // session token back into the webview via the exchange endpoint.
  async function openGoogleOAuth() {
    const Cap = (window as any).Capacitor;
    if (!Cap?.isNativePlatform?.()) {
      window.location.href = "/app/api/auth/google";
      return;
    }
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({
      url: "https://app.facturio.ch/app/api/auth/google?client=app",
      windowName: "_self",
    });
  }

  useEffect(() => {
    const Cap = (window as any).Capacitor;
    if (!Cap?.isNativePlatform?.()) return;
    let handle: { remove?: () => void } | undefined;
    (async () => {
      const { App } = await import("@capacitor/app");
      handle = await App.addListener("appUrlOpen", async (data: any) => {
        const url = data?.url || "";
        if (!url.startsWith("facturio://")) return;
        const token = new URL(url).searchParams.get("token");
        if (!token) return;
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.close();
        } catch {}
        window.location.href = "/app/api/auth/exchange?token=" + encodeURIComponent(token);
      });
    })();
    return () => { try { handle?.remove?.(); } catch {} };
  }, []);

  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      {/* Left brand panel (desktop) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,white_1.2px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        <div className="relative"><BrandLogo href="https://facturio.ch" inverse/></div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-5xl">
            {t('login.panelHeadline')}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/80">{t('login.panelSub')}</p>
          <ul className="mt-8 space-y-3">
            {[t('login.bullet1'), t('login.bullet2'), t('login.bullet3')].map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-[15px] text-white/90">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-white" /> {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-sm text-white/60">© 2026 facturio.ch</div>
      </div>

      {/* Right form panel */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 flex justify-center lg:hidden"><BrandLogo href="https://facturio.ch"/></div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'signup' ? t('login.headlineSignup') : t('login.headlineSignin')}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'signup' ? t('login.subSignup') : t('login.subSignin')}
            </p>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Authentication">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => setModeAndUrl('signin')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t('login.tabSignin')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => setModeAndUrl('signup')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t('login.tabSignup')}
                </button>
              </div>
              {oauthErrorMsg && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  {oauthErrorMsg}
                </div>
              )}
              {mode === 'signup' ? (
                <>
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = e.currentTarget as HTMLFormElement;
                      const data = Object.fromEntries(new FormData(f) as any) as any;
                      const errs: any = {};
                      if (!validateEmail(String(data.email || ''))) errs.email = t('login.errEmail');
                      if (!validatePassword(String(data.password || ''))) errs.password = t('login.errPassword');
                      setSignupErrors(errs);
                      if (Object.keys(errs).length) return;
                      setBusy(true);
                      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.email, password: data.password }) });
                      if (res.ok) {
                        const next = new URLSearchParams(window.location.search).get('next') || '/app/onboarding';
                        window.location.href = next;
                      } else {
                        const j = await res.json().catch(() => ({}));
                        setSignupErrors({ email: j.error || t('login.errGeneric') });
                        setBusy(false);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('common.email')}</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder={t('common.email')}
                        className={signupErrors.email ? 'border-destructive' : ''}
                        required
                        autoFocus
                        onChange={(e) => {
                          const v = e.target.value;
                          setSignupErrors((prev) => ({ ...prev, email: validateEmail(v) ? undefined : t('login.errEmail') }));
                        }}
                      />
                      {signupErrors.email && <p className="text-xs text-destructive">{signupErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('common.password')}</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          name="password"
                          type={showPwd ? 'text' : 'password'}
                          placeholder={t('common.password')}
                          className={`pr-10 ${signupErrors.password ? 'border-destructive' : ''}`}
                          required
                          onChange={(e) => {
                            const v = e.target.value;
                            setPwdScore(passwordScore(v));
                            setSignupErrors((prev) => ({ ...prev, password: validatePassword(v) ? undefined : t('login.errPassword') }));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPwd ? t('common.hidePassword') : t('common.showPassword')}
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (pwdScore / 5) * 100)}%`, backgroundColor: pwdScore >= 4 ? '#16a34a' : pwdScore >= 3 ? '#f59e0b' : '#ef4444' }}
                          />
                        </div>
                        <Badge variant={pwdScore >= 4 ? 'default' : pwdScore >= 3 ? 'secondary' : pwdScore >= 2 ? 'outline' : 'destructive'} className="text-xs">
                          {pwdScore >= 4 ? t('login.strengthStrong') : pwdScore >= 3 ? t('login.strengthOk') : pwdScore >= 2 ? t('login.strengthOk') : t('login.strengthWeak')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('login.pwdHint')}</p>
                      {signupErrors.password && <p className="text-xs text-destructive">{signupErrors.password}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? '…' : t('login.btnCreateAccount')}
                    </Button>
                  </form>
                  <div className="mt-5 text-center text-sm text-muted-foreground">
                    {t('login.alreadyHave')}{' '}
                    <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => setModeAndUrl('signin')}>
                      {t('login.signInLink')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <form
                    className="space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = e.currentTarget as HTMLFormElement;
                      const data = Object.fromEntries(new FormData(f) as any) as any;
                      setSignInError(null);
                      setBusy(true);
                      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.email, password: data.password }) });
                      if (res.ok) {
                        const next = new URLSearchParams(window.location.search).get('next') || '/app/onboarding';
                        window.location.href = next;
                      } else {
                        const j = await res.json().catch(() => ({}));
                        setSignInError(j.error || t('login.errCredentials'));
                        setBusy(false);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">{t('common.email')}</Label>
                      <Input id="signin-email" name="email" type="email" placeholder={t('common.email')} required autoFocus />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">{t('common.password')}</Label>
                        <a href="/reset" className="text-xs font-medium text-primary hover:underline">
                          {t('login.forgotPassword')}
                        </a>
                      </div>
                      <div className="relative">
                        <Input id="signin-password" name="password" type={showPwd ? 'text' : 'password'} placeholder={t('common.password')} className="pr-10" required />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPwd ? t('common.hidePassword') : t('common.showPassword')}
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {signInError && (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{signInError}</p>
                    )}
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? '…' : t('login.btnSignIn')}
                    </Button>
                  </form>
                  <div className="mt-5 text-center text-sm text-muted-foreground">
                    {t('login.noAccount')}{' '}
                    <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => setModeAndUrl('signup')}>
                      {t('login.createAccountLink')}
                    </button>
                  </div>
                </>
              )}

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{t('login.or')}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={openGoogleOAuth}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('login.google')}
              </button>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t('login.termsPrefix')}
            <a href="https://facturio.ch/agb" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{t('login.termsLabel')}</a>
            {t('login.termsAnd')}
            <a href="https://facturio.ch/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">{t('login.privacyLabel')}</a>
            {t('login.termsSuffix')}
          </p>
        </div>
      </div>
    </div>
  );
}
