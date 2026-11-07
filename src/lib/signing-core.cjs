const crypto = require('node:crypto');
const { parseQuoteText } = require('./quote-ocr.cjs');

const FIELD_TYPES = new Set(['signature', 'initials', 'date']);

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function validateSigningFields(fields, pageCount) {
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 100) {
    throw new Error('Fields must contain between 1 and 100 entries');
  }
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 200) {
    throw new Error('Invalid document page count');
  }
  const seen = new Set();
  for (const field of fields) {
    if (!field || typeof field !== 'object' || typeof field.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(field.id)) {
      throw new Error('Invalid field id');
    }
    if (seen.has(field.id)) throw new Error('Duplicate field id');
    seen.add(field.id);
    if (!FIELD_TYPES.has(field.type)) throw new Error('Invalid field type');
    if (!Number.isInteger(field.page) || field.page < 1 || field.page > pageCount) {
      throw new Error('Field page is outside the document');
    }
    for (const key of ['x', 'y', 'width', 'height']) {
      if (!Number.isFinite(field[key])) throw new Error(`Invalid field ${key}`);
    }
    if (field.x < 0 || field.y < 0 || field.width <= 0 || field.height <= 0 || field.x + field.width > 1 || field.y + field.height > 1) {
      throw new Error('Field is outside document page bounds');
    }
    if (field.required !== true && field.required !== false) throw new Error('Invalid required flag');
  }
  return fields;
}

function validateSignatureSubmission(fields, values, signerName) {
  if (typeof signerName !== 'string' || !signerName.trim() || signerName.trim().length > 120) {
    throw new Error('Signer name is required');
  }
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid field values');
  const allowedIds = new Set(fields.map((f) => f.id));
  if (Object.keys(values).some((id) => !allowedIds.has(id))) throw new Error('Unexpected field value');
  for (const field of fields) {
    const value = values[field.id];
    if ((value === undefined || value === null || value === '') && field.required) {
      throw new Error('Required field is missing');
    }
    if (value === undefined || value === null || value === '') continue;
    if (field.type === 'date') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid date field');
      const d = new Date(`${value}T00:00:00.000Z`);
      if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error('Invalid date field');
      continue;
    }
    if (typeof value !== 'string' || value.length > 500_000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      throw new Error('Invalid signature image');
    }
    const raw = Buffer.from(value.slice('data:image/png;base64,'.length), 'base64');
    if (raw.length < 8 || raw.length > 300_000 || raw.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
      throw new Error('Invalid signature image');
    }
  }
  return true;
}

function signingDeliveryMode({ previewMode, resendConfigured }) {
  if (previewMode === "1") return "link-only";
  return resendConfigured ? "email" : "unavailable";
}

module.exports = { createOpaqueToken, hashOpaqueToken, validateSigningFields, validateSignatureSubmission, parseQuoteText, signingDeliveryMode };
