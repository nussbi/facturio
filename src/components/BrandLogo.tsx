import Link from "next/link";

export default function BrandLogo({ href = "/", inverse = false, className = "" }: { href?: string; inverse?: boolean; className?: string }) {
  return <Link href={href} className={`f-brand-logo ${inverse ? "inverse" : ""} ${className}`} aria-label="facturio.ch — home">
    <span className="f-brand-mark" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg></span>
    <span>facturio.ch</span>
  </Link>;
}
