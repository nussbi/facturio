const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('app analytics identifiers and Inter font remain in the root layout', () => {
  const layout = read('app/layout.tsx');
  for (const id of ['G-9PFMBN2Z6X', 'GTM-KVC3DC5J']) assert.ok(layout.includes(id));
  assert.ok(layout.includes('Inter'));
  assert.ok(layout.includes('./brand.css'));
});
test('every public signing and customer portal route inherits the shared public shell', () => {
  for (const route of ['portal', 'sign', 'editor', 'send']) assert.ok(read(`app/${route}/layout.tsx`).includes('BrandPublicShell'));
  assert.ok(read('app/page.tsx').includes('BrandPublicShell'));
  const shell = read('components/BrandPublicShell.tsx');
  assert.ok(shell.includes('BrandPublicHeader'));
  assert.ok(shell.includes('BrandFooter'));
  assert.ok(!shell.includes('getCurrentUser'));
  assert.ok(!shell.includes('redirect('));
});
test('authenticated and auth-page layouts retain shared design without replacing auth', () => {
  const frame = read('components/AppFrame.tsx');
  assert.ok(frame.includes('f-app-frame'));
  assert.ok(frame.includes('BrandFooter'));
  assert.ok(frame.includes('BrandPublicHeader'));
  assert.ok(frame.includes('/login'));
  assert.ok(frame.includes('/reset'));
});
test('theme uses valid color values and does not force gradients onto error or success states', () => {
  assert.ok(read('app/brand.css').includes('--facturio-gradient'));
  assert.ok(read('app/brand.css').includes('--destructive:#dc2626'));
  assert.ok(!read('app/globals.css').includes('hsl(var(--background))'));
  assert.ok(read('components/SignDocument.tsx').includes('bg-emerald-50'));
});
test('the receipt brand is shared and language preference persists across Facturio subdomains', () => {
  assert.ok(read('components/BrandLogo.tsx').includes('M4 2v20'));
  assert.ok(read('components/language-context.tsx').includes('domain=.facturio.ch'));
  assert.ok(read('components/LanguageSwitcher.tsx').includes('aria-haspopup="menu"'));
});
test('the obsolete Worker marketing root no longer conflicts with the signing root', () => {
  assert.ok(!fs.existsSync(path.join(root, 'app/(landing)/page.tsx')));
  assert.ok(read('app/page.tsx').includes('SignUpload'));
});
