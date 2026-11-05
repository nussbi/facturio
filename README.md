# facturio

Swiss QR-bill invoicing app — Next.js 15 (App Router) + React 19, deployed to **Cloudflare Workers** via **OpenNext**, with **D1** (SQLite) for data and **R2** for invoice/signing PDFs.

> **Status of this repository.** This is the recovered source snapshot of the facturio application (from the `hermesbackup` export). It contains the core server/lib modules, the Prisma schema, the Cloudflare Worker entrypoint and the deployment/config files. The full Next.js route tree (`src/app/**` pages and API routes) and the `src/components/**` UI kit are **not** in this snapshot and must be restored from the live deployment / a full checkout. See [Repository contents](#repository-contents).

## What it does

- **Invoicing** with SIX-compliant **Swiss QR-bills** (PDF/SVG), multi-currency (CHF/EUR), per-user numbering.
- **Contacts** (customers) and **Expenses** with per-user data isolation.
- **Dashboard metrics**: DSO, on-time payment rate, A/R aging, cash-flow forecast, VAT YTD, slow-payer leaderboard.
- **Automated payment reminders** via a daily Cloudflare **Cron Trigger** → Resend email.
- **Standalone e-signature app** on `sign.facturio.ch` (upload → place fields → send → sign), same Worker, routed by `Host`.
- **Auth**: email/password (scrypt + HMAC session cookie) plus Google and SwissID OAuth.
- **Stripe** one-time Checkout links for online invoice payment.

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 (light theme only) |
| Runtime | Cloudflare Workers (OpenNext adapter) |
| Database | Cloudflare **D1** via Prisma driver adapter (`@prisma/adapter-d1`) |
| Object storage | Cloudflare **R2** (private buckets; PDFs served only via authorised routes) |
| Email | Resend (fallback: SMTP via nodemailer) |
| Payments | Stripe Checkout |
| QR-bills | `swissqrbill` + `pdfkit` |
| PDF signing | `pdf-lib` |

### Hosts / routing

One Worker serves two custom domains, split by `Host` in `src/middleware.ts`:

- `app.facturio.ch` → authenticated app (rewritten under `/app/*`)
- `sign.facturio.ch` → standalone signing app (`/`, `/editor/*`, `/send/*`, `/sign/*`, `/api/sign/*`, `/api/upload*`)
- `staging.app.facturio.ch` / `staging.sign.facturio.ch` → staging (same code, `STAGING_MODE=1`)

## Repository contents

```
.
├── worker-entry.js            # Cloudflare Worker entrypoint (fetch + scheduled cron)
├── wrangler.jsonc             # Worker config: routes, D1, R2, vars, cron
├── open-next.config.ts        # OpenNext Cloudflare adapter config
├── next.config.ts             # Next.js config
├── package.json
├── prisma/schema.prisma       # Data model (SQLite/D1)
├── src/
│   ├── middleware.ts          # Host-based routing (app vs sign)
│   ├── server/
│   │   ├── db.ts              # Prisma client (D1 adapter, per-request cache)
│   │   ├── auth.ts            # Sessions, password hashing, OAuth helpers
│   │   └── mailer.ts          # Resend / SMTP email
│   ├── lib/
│   │   ├── qrbill.ts          # Swiss QR-bill + full invoice PDF generation
│   │   ├── metrics.ts         # Dashboard analytics
│   │   ├── reminders.ts       # Payment-reminder emails
│   │   ├── invoiceArchive.ts  # R2-backed invoice PDF archive
│   │   ├── signing.ts         # PDF signing (pdf-lib)
│   │   ├── payments.ts        # Stripe Checkout links
│   │   ├── googleOauth.ts     # Google OAuth
│   │   ├── swissidOauth.ts    # SwissID OAuth
│   │   └── emailTemplates.ts  # Transactional email HTML
│   └── app/
│       ├── admin-page.tsx     # Admin/landing page component
│       └── upload-page.tsx    # Signing upload page component
├── scripts/
│   ├── quote-ocr.cjs          # Quote/amount parsing from signed docs
│   └── signing-core.cjs       # Signing validation + token helpers
└── docs/                      # Architecture & deployment notes
```

## Local development

```bash
npm install
cp .env.example .env.local     # fill in your own values
npx prisma generate
npm run dev                    # http://localhost:3000
```

## Deployment (Cloudflare Workers)

```bash
npx opennextjs-cloudflare build
npx wrangler deploy            # uses wrangler.jsonc
```

Secrets are **not** in this repo. Set them with `wrangler secret put <NAME>` (see `.env.example` for the full list) or via the Cloudflare dashboard.

## Security

See [SECURITY.md](./SECURITY.md). **No credentials are committed to this repository.** All secrets are supplied at deploy time.
