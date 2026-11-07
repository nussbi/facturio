export type IbanValidation = { valid: boolean; country?: "CH" | "DE" | "AT" | "LI"; normalized: string; error?: string };

const COUNTRY_LENGTH: Record<string, number> = {
  CH: 21,
  DE: 22,
  AT: 20,
  LI: 21,
};

function alphanumToDigits(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch >= 48 && ch <= 57) {
      out += String.fromCharCode(ch);
    } else if (ch >= 65 && ch <= 90) {
      out += String((ch - 55)); // A=10 ... Z=35
    } else {
      return ""; // invalid char
    }
  }
  return out;
}

function mod97(numberStr: string): number {
  let remainder = 0;
  const chunkSize = 9;
  for (let i = 0; i < numberStr.length; i += chunkSize) {
    const chunk = numberStr.substring(i, i + chunkSize);
    remainder = Number(String(remainder) + chunk) % 97;
  }
  return remainder;
}

export function validateIban(input: string | undefined | null): IbanValidation {
  const normalized = (input || "").replace(/\s|-/g, "").toUpperCase();
  if (!normalized) return { valid: true, normalized: "" };
  if (!/^[A-Z0-9]+$/.test(normalized)) return { valid: false, normalized, error: "Invalid characters" };
  const country = normalized.slice(0, 2) as "CH" | "DE" | "AT" | "LI";
  if (!COUNTRY_LENGTH[country]) return { valid: false, normalized, error: "Unsupported IBAN country" };
  if (normalized.length !== COUNTRY_LENGTH[country]) return { valid: false, normalized, error: "Invalid IBAN length" };
  // Rearrange and convert for mod-97
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const digits = alphanumToDigits(rearranged);
  if (!digits) return { valid: false, normalized, error: "Invalid characters" };
  const remainder = mod97(digits);
  if (remainder !== 1) return { valid: false, normalized, error: "Failed checksum" };
  return { valid: true, country, normalized };
}

