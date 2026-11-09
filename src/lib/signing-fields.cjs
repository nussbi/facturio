function newSigningField(type, page, x, y, id = globalThis.crypto.randomUUID()) {
  const width = type === 'signature' ? 0.36 : type === 'initials' ? 0.18 : 0.23;
  const height = type === 'signature' ? 0.12 : type === 'initials' ? 0.085 : 0.045;
  return { id, type, page, x: Math.max(0, Math.min(1 - width, x - width / 2)), y: Math.max(0, Math.min(1 - height, y - height / 2)), width, height, required: true };
}
function editSigningField(field, mode, dx, dy) {
  const next = { ...field };
  if (mode === 'move') {
    next.x = Math.max(0, Math.min(1 - field.width, field.x + dx));
    next.y = Math.max(0, Math.min(1 - field.height, field.y + dy));
  } else {
    next.width = Math.max(Math.min(0.08, 1 - field.x), Math.min(1 - field.x, field.width + dx));
    next.height = Math.max(Math.min(0.025, 1 - field.y), Math.min(1 - field.y, field.height + dy));
  }
  return next;
}
module.exports = { newSigningField, editSigningField };
