# Standalone signing app — sign.facturio.ch / staging.sign.facturio.ch

## Overview

A completely separate app from `app.facturio.ch` with its own domain, middleware routing, and database tables. Runs on Cloudflare Workers via OpenNext + Prisma/D1.

## URL structure

- **Production**: `https://sign.facturio.ch`
- **Staging**: `https://staging.sign.facturio.ch`

Both served by the same Worker, differentiated by `host` header in middleware.

## Workflow (three pages)

1. **Upload** (`/`) — drag-and-drop any PDF (max 12 MB). Creates a `SigningEnvelope` in D1, stores PDF in R2, returns envelope ID.
2. **Editor** (`/editor/[id]`) — displays PDF in an iframe; user clicks to place signature/initials/date fields. Fields saved to `fieldsJson` on the envelope.
3. **Send** (`/send/[id]`) — enter recipient email; POST to `/api/send/[id]` creates a signing token, stores `tokenHash` on envelope, updates status to `SENT`, returns signing URL.
4. **Sign** (`/sign/[token]`) — recipient opens link, signs document, downloads signed PDF.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload` | POST | Upload PDF, create envelope |
| `/api/upload/[id]` | GET | Get envelope metadata |
| `/api/upload/[id]/document` | GET | Serve PDF for viewing/signing |
| `/api/upload/[id]/fields` | PUT | Save field positions |
| `/api/send/[id]` | POST | Send for signature, create token |
| `/api/sign/[token]` | GET/POST | Signing page / submit signature |
| `/api/signup` | POST | Create Sign account from signer |

## Middleware routing

Middleware at `src/middleware.ts` inspects `headers().get('host')` to route:

```typescript
const host = (await headers()).get('host') || '';
const isAppDomain = host === 'staging.app.facturio.ch' || host === 'app.facturio.ch' || host.endsWith('.app.facturio.ch');
const isSignDomain = host === 'staging.sign.facturio.ch' || host === 'sign.facturio.ch' || host.endsWith('.sign.facturio.ch');
```

Paths allowed on sign domain: `/`, `/editor/*`, `/send/*`, `/sign/*`, `/api/sign/*`, `/api/upload*`.

## STAGING_MODE

Environment variable `STAGING_MODE=1` on staging Worker causes `/api/send` to return a copy-able signing link instead of sending email via Resend. Useful for testing without SMTP.

## PDF iframe embedding

The editor page embeds the PDF via `<iframe src="/api/upload/[id]/document" allow="fullscreen" />`. For the iframe to load on the same origin, the document API must return:

```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'
Content-Type: application/pdf
Content-Disposition: inline; filename="document-[id].pdf"
```

Without these headers, browsers block the iframe (blank page).

### Mobile fallback

Mobile browsers (Chrome Android, iOS Safari) do NOT render PDFs inline in `<iframe>` or `<object>` tags — they show a blank area or a placeholder. Always include a prominent "Open PDF in new tab" button below the iframe:

```tsx
<div style={{ marginTop: 16, textAlign: 'center', padding: '16px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
  <p style={{ margin: '0 0 12px 0', color: '#0369a1', fontSize: '0.9rem' }}>
    Can't see the PDF above? <strong>Mobile browsers don't display PDFs inline.</strong>
  </p>
  <a href={`/api/upload/${id}/document`} target="_blank" rel="noopener noreferrer" style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 24px', background: '#0ea5e9', color: 'white',
    borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '1rem'
  }}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
    Open PDF in new tab
  </a>
</div>
```

On desktop the iframe works; on mobile the user taps the button and the PDF opens in a new tab where it renders correctly.

## Database schema (Prisma)

```prisma
model SigningEnvelope {
  id                 String        @id @default(uuid())
  title              String
  originalFileName   String
  r2Key              String
  documentKey        String
  signedDocumentKey  String?
  pageCount          Int           @default(1)
  status             SigningStatus @default(DRAFT)
  fieldsJson         String        @default("[]")
  recipientEmail     String?
  tokenHash          String?
  createdAt          DateTime      @default(now())
  sentAt             DateTime?
  signedAt           DateTime?
  expiresAt          DateTime?
}

enum SigningStatus {
  DRAFT
  SENT
  SIGNED
  EXPIRED
}
```

## R2 storage

- Bucket: `facturio-signing-pdfs` (prod) / `facturio-staging-pdfs` (staging)
- Key format: `envelopes/{envelopeId}/{filename}`
- Signed PDFs stored under `envelopes/{envelopeId}/signed/`

## Deployment

Same Worker as `app.facturio.ch` — single OpenNext build, single Worker, multiple routes in `wrangler.staging.jsonc`:

```jsonc
"routes": [
  { "pattern": "staging.app.facturio.ch/*", "zone_name": "facturio.ch" },
  { "pattern": "staging.sign.facturio.ch/*", "zone_name": "facturio.ch" }
]
```

Environment variables:
- `APP_BASE_URL=https://staging.app.facturio.ch`
- `SIGNING_BASE_URL=https://staging.sign.facturio.ch`
- `PUBLIC_BASE_URL=https://staging.facturio.ch`
- `STAGING_MODE=1`

## Verification

- Upload page: HTTP 200, file input accepts PDF
- Editor page: HTTP 200, PDF renders in iframe (check iframe headers)
- Send page: HTTP 200, POST returns token + signingUrl
- Sign page: HTTP 200
- Document API: `Content-Type: application/pdf`, `X-Frame-Options: SAMEORIGIN`, `CSP: frame-ancestors 'self'`

## Pitfalls

- **Missing iframe headers = blank PDF**. Without `X-Frame-Options: SAMEORIGIN` and `CSP: frame-ancestors 'self'`, the browser refuses to embed the PDF in the iframe. The page loads (200) but the iframe stays empty.
- **Middleware host check too strict**. Must include both staging and production hostnames, and the `endsWith('.sign.facturio.ch')` pattern for custom subdomains.
- **PDF API returning 503 / 404 inside iframe**. Check R2 bucket binding exists in `wrangler.jsonc` and `signingBucket()` resolves to the correct bucket name.
- **STAGING_MODE not set** = Resend emails attempted on staging. Set `STAGING_MODE=1` in Worker env vars.
- **Single Worker, multiple routes**. The same `.open-next/worker.js` serves both app and sign domains. Do NOT create separate Workers unless architecture demands it.
- **Editor page as server component** renders PDF iframe on initial HTML (no "Loading..." flash). Use a client component only when interactive field placement (click-to-add) is needed — the server component renders the iframe immediately; a client component requires a `useEffect` fetch that shows a loading state first.
- **Upload page must navigate to real editor URL**. After upload, use `window.location.href = `/editor/${data.id}` to navigate to the dedicated `/editor/[id]` page. Do NOT use client-side state switching (step-based rendering) — the editor needs its own URL for browser history, sharing, and direct access.
- **Iframe `allow="fullscreen"`** attribute on the PDF iframe enables fullscreen viewing in the browser PDF viewer.
- **Cloudflare Workers/OpenNext does not support "use client" directive properly** — client components don't hydrate on Workers. Server components render the iframe immediately; client components show "Loading..." then fail to hydrate. Use server components for the editor page.
- **pdf.js worker fails on Cloudflare Pages** — the `pdf.worker.min.mjs` bundling fails. Using CDN workerSrc (`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`) helps but dynamic imports of pdfjs-dist fail in the Workers environment. Stick with iframe + mobile fallback for reliable cross-browser rendering.
- **Browser Rendering API requires authentication** — not straightforward for inline PDF rendering. Requires API token with browser-rendering permissions. Use iframe + mobile fallback instead.
- **Object tag fallback doesn't work on mobile** — `<object data="..." type="application/pdf">` has the same mobile limitation as iframe. The "Open in new tab" button is the only reliable mobile fallback.