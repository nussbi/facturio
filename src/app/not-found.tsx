import BrandPublicShell from "@/components/BrandPublicShell";

export default function NotFound() {
  return <BrandPublicShell><main className="mx-auto max-w-2xl px-6 py-20 text-center"><p className="text-xs font-semibold uppercase tracking-widest text-blue-600">404 · facturio.ch</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">This page isn’t available</h1><p className="mt-4 text-gray-600">The address may be incorrect, or this private link may have been replaced or revoked.</p><a className="f-button mt-8" href={process.env.PUBLIC_BASE_URL || "https://facturio.ch"}>Back to facturio.ch</a></main></BrandPublicShell>;
}
