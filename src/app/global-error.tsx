"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return <html lang="en"><head><title>Unable to load · facturio.ch</title><script async src="https://www.googletagmanager.com/gtag/js?id=G-9PFMBN2Z6X"/><script dangerouslySetInnerHTML={{ __html: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-9PFMBN2Z6X');" }}/></head><body style={{ margin: 0, background: "#f8faff", color: "#111827", fontFamily: "Inter, system-ui, sans-serif" }}><main style={{ maxWidth: 560, margin: "10vh auto", padding: 32, border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff" }}><a href="https://facturio.ch" style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "#003cff", textDecoration: "none", fontSize: 19, fontWeight: 700 }}><img src="/brand/facturio-logo.svg" width={36} height={36} alt=""/>facturio.ch</a><h1 style={{ marginTop: 32, fontSize: 30, fontWeight: 600, letterSpacing: "-.03em" }}>Something went wrong</h1><p style={{ color: "#6b7280", lineHeight: 1.7 }}>We couldn’t load this page. Please try again.</p>{error.digest && <p style={{ fontSize: 12, color: "#6b7280" }}>Reference: {error.digest}</p>}<button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 20px", border: 0, borderRadius: 10, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", background: "linear-gradient(100deg,#4f46e5,#2563eb,#06b6d4)" }}>Try again</button></main></body></html>;
}
