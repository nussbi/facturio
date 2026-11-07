import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format numbers with Swiss formatting (apostrophes for thousands, dots for decimals)
 * Examples: 1'000, 1'500.50, 500.50
 */
export function formatSwissNumber(n: number | null | undefined, opts: Intl.NumberFormatOptions = {}): string {
  if (n == null) return "-";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return "-";

  // Deterministic Swiss formatting (apostrophe thousands, dot decimals).
  // We avoid Intl.NumberFormat('de-CH') here on purpose: it can render
  // differently between the Cloudflare Worker (SSR) and the browser, which
  // produces a React hydration mismatch on the dashboard.
  const minFrac = opts.minimumFractionDigits ?? 0;
  const maxFrac = Math.max(minFrac, Math.min(20, opts.maximumFractionDigits ?? 2));
  const fixed = num.toFixed(maxFrac);
  let [intPart, fracPart = ""] = fixed.split(".");
  const neg = intPart.startsWith("-");
  if (neg) intPart = intPart.slice(1);
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  let out = (neg ? "-" : "") + intPart;
  while (fracPart.length > minFrac && fracPart.endsWith("0")) fracPart = fracPart.slice(0, -1);
  if (fracPart.length > 0) out += "." + fracPart;
  return out;
}

/**
 * Format a date in European (Swiss) format: DD.MM.YYYY, 24-hour time, no AM/PM.
 * withTime=true → "18.09.2026, 17:45:47"; withTime=false → "18.09.2026".
 * Times are shown in Europe/Zurich to match the rest of the app.
 */
// Europe/Zurich UTC offset in ms (CET = +1h, CEST = +2h), computed manually so
// date formatting is deterministic on both the Cloudflare Worker (SSR) and the
// browser (no dependence on the worker's ICU timezone database).
function zurichOffsetMs(d: Date): number {
  const y = d.getUTCFullYear();
  const lastSunday = (month: number) => {
    const last = new Date(Date.UTC(y, month + 1, 0));
    const dow = last.getUTCDay();
    return Date.UTC(y, month, last.getUTCDate() - dow, 1, 0, 0);
  };
  const dstStart = lastSunday(2); // last Sunday of March, 01:00 UTC
  const dstEnd = lastSunday(9);   // last Sunday of October, 01:00 UTC
  const t = d.getTime();
  return t >= dstStart && t < dstEnd ? 2 * 3600000 : 3600000;
}

export function formatDate(d: Date | string | number | null | undefined, withTime = false): string {
  if (d == null) return "-";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "-";
  const z = new Date(date.getTime() + zurichOffsetMs(date));
  const dd = String(z.getUTCDate()).padStart(2, "0");
  const mm = String(z.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = z.getUTCFullYear();
  const out = `${dd}.${mm}.${yyyy}`;
  if (!withTime) return out;
  const hh = String(z.getUTCHours()).padStart(2, "0");
  const mi = String(z.getUTCMinutes()).padStart(2, "0");
  const ss = String(z.getUTCSeconds()).padStart(2, "0");
  return `${out}, ${hh}:${mi}:${ss}`;
}

/**
 * Format an IBAN with spaces in groups of 4 for readability.
 * "CH9300762011623852957" → "CH93 0076 2011 6238 5295 7"
 */
export function formatIban(iban?: string | null): string {
  if (!iban) return "";
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Format an ISO 11649 creditor reference for display.
 * "RF18539007547034" → "RF18 5390 0754 7034"
 */
export function formatReference(ref?: string | null): string {
  if (!ref) return "";
  const clean = ref.replace(/\s+/g, "");
  if (/^RF/i.test(clean)) {
    const check = clean.slice(2, 4);
    const rest = clean.slice(4);
    return `RF${check} ${rest.replace(/(.{4})/g, "$1 ").trim()}`;
  }
  return clean.replace(/(.{4})/g, "$1 ").trim();
}
