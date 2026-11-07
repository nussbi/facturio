import mapping from "@/data/ch_zip_to_canton.json" assert { type: "json" };

export function inferCantonFromZip(zip: string): string | undefined {
  const z = zip.trim();
  if (mapping[z as keyof typeof mapping]) {
    return mapping[z as keyof typeof mapping] as unknown as string;
  }
  // Simple fallback by two-digit prefix (non-exhaustive, heuristic)
  const two = z.slice(0, 2);
  const prefixMap: Record<string, string> = {
    "80": "ZH",
    "81": "ZH",
    "30": "BE",
    "31": "BE",
    "12": "GE",
    "10": "VD",
    "11": "VD",
    "40": "BS",
    "60": "LU",
    "90": "TI",
    "70": "GR",
    "50": "AG",
  };
  return prefixMap[two];
}

