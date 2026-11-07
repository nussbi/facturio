"use client";

import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="f-card mx-auto max-w-xl p-8"><p className="text-xs font-semibold uppercase tracking-widest text-blue-600">facturio.ch</p><h1 className="mt-4 text-3xl font-semibold tracking-tight">Something went wrong</h1><p className="mt-3 text-sm leading-relaxed text-gray-600">We couldn’t load this page. Please try again.</p>{error.digest && <p className="mt-3 text-xs text-gray-500">Reference: {error.digest}</p>}<Button type="button" className="mt-6" onClick={reset}>Try again</Button></section>;
}
