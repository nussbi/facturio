import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.OPENPLZ_API_BASE || "https://openplzapi.org").replace(/\/$/, "");

// Simple in-memory cache per process and persisted file cache
const cache = new Map<string, string>();
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "openplz-cache.json");

function ensureCacheLoaded() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return;
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const obj = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(obj)) cache.set(k, v);
  } catch {}
}

function persistCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const obj: Record<string, string> = {};
    for (const [k, v] of cache.entries()) obj[k] = v;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), "utf-8");
  } catch {}
}

ensureCacheLoaded();

type BaseRegion = { key?: string; name?: string; shortName?: string };

type LocalityCH = {
  key: string;
  name: string;
  postalCode: string;
  canton?: BaseRegion;
};

type LocalityDE = {
  key: string;
  name: string;
  postalCode: string;
  state?: BaseRegion;
};

type LocalityAT = LocalityDE;

type LocalityLI = {
  key: string;
  name: string;
  postalCode: string;
  // Liechtenstein has no cantons; treat country as region or return undefined
  state?: BaseRegion;
  canton?: BaseRegion;
};

type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

function normCountry(country: string): "ch" | "de" | "at" | "li" | undefined {
  const c = country.trim().toLowerCase();
  if (["ch", "switzerland", "schweiz", "suisse"].includes(c)) return "ch";
  if (["de", "germany", "deutschland"].includes(c)) return "de";
  if (["at", "austria", "österreich", "oesterreich"].includes(c)) return "at";
  if (["li", "liechtenstein"].includes(c)) return "li";
  return undefined;
}

function regionFromLocality(loc: any): { code?: string; name?: string } | undefined {
  const reg: BaseRegion | undefined = loc.canton || loc.state;
  if (!reg) return undefined;
  return { code: reg.shortName || reg.name, name: reg.name };
}

export async function lookupRegionByZip(country: string, zip: string): Promise<{ code?: string; name?: string } | undefined> {
  const z = zip.trim();
  const cc = normCountry(country);
  if (!z || !cc) return undefined;
  const key = `${cc}:${z}`;
  const cached = cache.get(key);
  if (cached) return { code: cached, name: cached };

  const url = `${BASE}/${cc}/Localities?postalCode=${encodeURIComponent(z)}`;

  // Retry with exponential backoff
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`OpenPLZ ${res.status}`);
      type AnyLoc = LocalityCH | LocalityDE | LocalityAT | LocalityLI | Record<string, any>;
      const data = (await res.json()) as Paged<AnyLoc> | AnyLoc[];
      const items = Array.isArray(data) ? data : data.items;
      if (!items || items.length === 0) return undefined;
      const region = regionFromLocality(items[0]);
      if (region?.code) {
        cache.set(key, region.code);
        persistCache();
      }
      return region;
    } catch (err) {
      lastErr = err;
      // backoff: 200ms, 400ms, 800ms
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
    }
  }
  // After retries, give up
  return undefined;
}

// Back-compat for Switzerland-only lookup
export async function lookupCantonByZip(zip: string): Promise<string | undefined> {
  const res = await lookupRegionByZip("CH", zip);
  return res?.code;
}

