function parseAmount(raw) {
  const cleaned = String(raw).replace(/[\s\u00a0'’]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    normalized = cleaned.replace(decimal === ',' ? /\./g : /,/g, '').replace(decimal, '.');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const at = lastComma >= 0 ? lastComma : lastDot;
    const decimals = cleaned.length - at - 1;
    normalized = decimals === 2 ? cleaned.slice(0, at).replace(/[.,]/g, '') + '.' + cleaned.slice(at + 1) : cleaned.replace(/[.,]/g, '');
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function parseQuoteText(text) {
  const source = String(text || '');
  const lines = source.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const currency = /\bEUR\b|€/i.test(source) ? 'EUR' : 'CHF';
  const amountPattern = /(?:CHF|EUR|SFr\.?|€)?\s*(-?\d[\d\s\u00a0'’.,]*\d|\d)(?:\s*(?:CHF|EUR|SFr\.?|€))?/i;
  const parsed = lines.map((line) => ({ line, amount: parseAmount(line.match(amountPattern)?.[1] || '') })).filter((x) => x.amount !== null);
  const totalLine = [...parsed].reverse().find(({ line }) => /total|amount due|balance due|montant|betrag|summe|gesamt|grand total|net payable/i.test(line));
  const total = totalLine?.amount ?? parsed.at(-1)?.amount ?? null;
  const description = lines.find((line) => !/total|amount due|balance due|invoice|quote|offer|date|vat|mwst|tax|amount|betrag|summe|montant|\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/i.test(line) && !/\b(?:CHF|EUR)\b|€/i.test(line)) || 'Services described in signed document';
  return { currency, total, description };
}

module.exports = { parseQuoteText };
