# facturio

Lightweight invoicing, contacts, and expense tracking with Swiss QR-bill generation.

This README is maintained continuously. It documents current app logic, data assumptions, and design decisions as they evolve.

## App Brief

facturio is a Next.js app with a SQLite database and built-in Swiss QR bill generation. It supports locale-aware address entry, dynamic state/canton lookups via OpenPLZ (CH, DE, AT, LI), and a streamlined invoice flow with live QR bill preview.

Current theme: Light-only (theme toggle removed).

### Architecture
- Next.js 15 (App Router) + React 19
- Tailwind CSS v4 for styling (light theme only)
- SQLite with Prisma ORM
- Built-in QR-bill generation using swissqrbill Node.js library (PDF/SVG)
- OpenPLZ client with retry/backoff and a persistent file-based cache to reduce external calls

#### Notable logic decisions
- Multi‑user data isolation: Contacts (Customers), Expenses, and Invoices are scoped per user via userId. All API routes and pages filter by the authenticated user, and creation automatically assigns userId.
- OrgProfile is also per user; onboarding configures the current user’s creditor details (company, address, IBAN, etc.).
- Initial dataset ownership: legacy/seeded data is assigned to the admin account (nussbaumer@gmail.com). Newly registered users (e.g., u.nussbaumer@gmail.com) start with an empty dataset until they create their own contacts/expenses/invoices.
- OrgProfile.defaultVat is optional and used to prefill VAT in the invoice form when there is no prior customer invoice VAT. Admin can edit it on /admin.
- VAT prefill order of precedence: last invoice for selected customer (if not manually touched) → OrgProfile.defaultVat → 0%.
- IBAN is mandatory when creating a new customer inline in the invoice form.
- Invoice amount input is free-text with strict decimal pattern (two decimals), no numeric spinners.
- Global search searches customers and invoices with autocomplete (scoped to the current user).
- Main nav shows "Logout" with your email when authenticated; otherwise shows "Account".
- Footer “Dashboard” link points to the main dashboard.
- Invoices list has pagination (10/page), search and date filters, and download buttons for PDF/SVG/JPG.
- Customer page shows the last 10 invoices, and has contextual “New invoice” (prefills contact) and “New expense” actions.
- Editing a customer and clicking Save redirects back to the customer page.
- On the invoices page, when filtering PAID, a Paid column is displayed.
- All users created via UI/API are marked founder=true by default (including seed and register endpoints).

### Key Features
- Customers
  - Simple address entry (no state/canton)
- Expenses
  - Simple expense tracking UI; each expense has a Title and Description
  - Expenses can be tied to customers; seed script can create Time and Goods expenses per customer
- Invoices
  - Clean creation flow on a dedicated page (/invoices/new)
  - QR-bill options integrated into the form
  - Live QR preview generated using built-in swissqrbill library
- Admin
  - Organization settings management (default VAT)

### Data Model & Migrations
- Database: SQLite
- Address region field is standardized as `state` (renamed from `canton`)
- Prisma is used for migrations and client generation
- Added OutputSize enum and optional `Invoice.outputSize` to persist the QR output size used for the invoice (e.g., A4_PORTRAIT_SHEET vs QR_BILL_ONLY).

### OpenPLZ
- Previously used for region auto-fill; not used in the current UI

### QR-Bill Generation
- Built-in Node.js library (swissqrbill) for PDF and SVG generation
- No external service required - always available
- Supports all bill options and languages offered by the library

### Invoice generation & documents
- All generated documents are stored under `documents/invoices/{userId}/invXXX-XXX-XXX.{pdf,svg,jpg}`
  - `invXXX-XXX-XXX` is a 9-digit per-user invoice number grouped in 3s (e.g., inv000-123-456). If a number is missing, a stable fallback based on the invoice id is used.
- Generation uses the persisted invoice `outputSize` (A4 vs QR-only) and QR options.
- A seed script prints the total size of the `documents` folder at the end.

## Getting Started

### Requirements
- Node.js (LTS)

### Environment variables (auth)
- SECRET_KEY: HMAC for session cookies (required for production)
- RESEND_API_KEY: Optional API key for email notifications
- FROM_EMAIL: Optional from email address for notifications

A starter file is provided in `.env.example`. Copy it to `.env.local` and fill in your real values.

### Quick start (recommended)
```bash
npm run migrate      # Run migrations (first time only)
npm run dev          # Start dev server
```
Then open http://localhost:3000

#### Configure Google OAuth (to fix invalid_client)
1) Create OAuth credentials in Google Cloud Console (type: Web application).
2) Add an Authorized redirect URI: http://localhost:3000/api/auth/google/callback
3) Copy the client ID/secret into `.env.local` as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
4) Restart the dev server after changing env vars.

If you see "Error 401: invalid_client", the client ID/secret is missing or incorrect, or the redirect URI doesn’t match exactly.

### Environment
- Prisma expects DATABASE_URL. Default for local SQLite:
  - DATABASE_URL=file:./prisma/dev.db

### Routes (UI)
- /login      Signup-first page (toggle to sign in). Google/SwissID SSO. Force sign-in view via /login?mode=signin. Live validation + password strength meter; localized hints (en/de). Sign‑up collects email and password only (no name).
- /reset      Request password reset or confirm a reset using a token
- /onboarding Collect your own invoicing details (creditor: company, address, IBAN). Email is not requested here. After saving, you are redirected to the dashboard. Access to app pages is gated until onboarding is complete.
- /           Home (dashboard with stats) – protected by login (redirects to /onboarding until completed)
- /contacts   Manage customers – protected (per-user data). New users see zero customers until they add their own.
- /contacts/[id]   Customer details + changes; edit via /contacts/[id]/edit – protected (per-user data)
- /expenses   Manage expenses – protected (per-user data). New users see zero expenses until they add their own.
- /invoices   List invoices – protected (per-user data). New users see zero invoices until they create their own.
- /invoices/new   Create invoice – protected (per-user data)
- /admin      Admin dashboard – accessible only to admin (nussbaumer@gmail.com or role=ADMIN)

### API Notes
- /api/org to seed or update organization details (uses the `state` field)
- /api/auth/register – email/password signup (new users marked founder=true). If email is nussbaumer@gmail.com, role=ADMIN.
- /api/auth/login – email/password sign in
- /api/auth/logout – clear session cookie

### Theming
- Light-only theme
- Theme toggle removed; dark-mode code fully removed

### Branding
- Name: facturio
- Brand gradient (logo/text):
  - from indigo-600: #4F46E5
  - via blue-600: #2563EB
  - to cyan-500: #06B6D4
- CSS example for the brand gradient:

```css
background-image: linear-gradient(to right, #4F46E5, #2563EB, #06B6D4);
```

- Utility: a .brand-gradient helper is available (defined in src/app/globals.css) that applies this gradient to text via background-clip.

## Design system

Primitives (source files)
- Button — src/components/ui/Button.tsx
- Card — src/components/ui/Card.tsx (Card, CardHeader, CardContent)
- Table — src/components/ui/Table.tsx (Table, THead, TBody, TR, TH, TD)
- Toast — src/components/ui/Toast.tsx (ToastProvider, useToast)
- Globals — src/app/globals.css (design tokens, utilities)

Buttons
- Variants: primary (brand gradient), secondary (indigo tint), outline, ghost
- Sizes: sm | md | lg (default md)
- Props: loading?: boolean (shows spinner and disables)
- Focus states: focus-visible ring with brand accent; subtle shadow on hover

Example

```tsx
import Button from "@/components/ui/Button";

export default function Example() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Small</Button>
      <Button size="lg" loading>Saving…</Button>
    </div>
  );
}
```

Cards
- Variants: elevated (default), outline, glass, ghost
- Usage: compose CardHeader and CardContent for readability and consistent spacing

```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function Block() {
  return (
    <Card variant="elevated">
      <CardHeader title="Block title" actions={<Button size="sm">Action</Button>} />
      <CardContent>
        Content goes here.
      </CardContent>
    </Card>
  );
}
```

Tables
- Components: Table, THead, TBody, TR, TH, TD
- Features: responsive container, sticky-like header style, zebra rows, gentle hover

```tsx
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export default function Example() {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Name</TH>
          <TH>Email</TH>
        </TR>
      </THead>
      <TBody>
        <TR>
          <TD>Alice</TD>
          <TD>alice@example.com</TD>
        </TR>
      </TBody>
    </Table>
  );
}
```

Toasts
- Wrap your app with ToastProvider (already wired in src/components/Providers.tsx)
- Use the hook to show a toast: variants "info" | "success" | "error"

```tsx
import { useToast } from "@/components/ui/Toast";

export default function SaveButton() {
  const { show } = useToast();
  return (
    <button
      onClick={() => show({ title: "Saved!", variant: "success" })}
      className="text-sm underline"
    >
      Save
    </button>
  );
}
```

Tokens & utilities
- Brand gradient variables in src/app/globals.css:
  - --brand-from: #4F46E5, --brand-mid: #2563EB, --brand-to: #06B6D4
- Utility: .brand-gradient for applying the gradient to text
- Radii: --radius-sm/md/lg; Shadows: --shadow-sm/md; Motion: --ease-smooth, --duration-fast/normal
- Link accent uses indigo hover for consistency across pages

### Seed scripts
- npm run seed:org — seed OrgProfile with IBAN
- npm run seed:strongwinds — create/update Strongwinds GmbH with IBAN
- npm run seed:expenses — add two expenses per customer (Time 100 CHF, Goods 250 CHF)
- npm run seed:test-invoices — generate 1,000 invoices (see below) and store PDF/SVG/JPG under documents/

#### Historical invoice dataset (seed:test-invoices)
- 1,000 invoices issued from Jan 2025 to current month, distributed roughly evenly per month.
- Terms: majority 30 days; also include 10, 15, 90 days and a “specific date” rule (usually 25th same month or 10th next month).
- Status: ~5% per month are never paid (remain SENT). Others are PAID with a plausible paidAt before/around due date.
- Currency split: ~90% CHF, ~10% EUR.
- Output size split: ~50% A4_PORTRAIT_SHEET, ~50% QR_BILL_ONLY.
- Expenses randomly mixed for goods/services and amounts to form realistic line items.
- The script purges existing invoices/items and clears `documents/invoices` before regenerating.

## Development Notes
- On changes to Tailwind config or globals, a dev server restart is recommended
- SQLite database is stored in `prisma/dev.db`

## Dashboard metrics
- DSO (avg days to pay, trailing 90 days), weighted by invoice amount
- OTPR (on‑time payment rate, trailing 90 days)
- Outstanding (CHF/EUR)
- Expected next 30 days (forecast using median customer payment delay over last 6 months)
- Revenue at risk (open 30+ days past due)
- VAT YTD (by currency)
- A/R aging buckets: Current, 1–30, 31–60, 61–90, >90
- Currency exposure bar for outstanding
- Format impact (A4 vs QR-only): median days to pay and on-time rate (last 6 months)
  - Notes: auto-detects Prisma client capability for `Invoice.outputSize`. If client is stale (no field in select), metrics fallback silently and this card is hidden.
- Payment terms mix (10/15/30/90/specific): counts, percentage, and median days to pay (last 6 months)
- Terms impact: for each term bucket, shows (n), median days to pay, and on‑time rate (last 6 months)
- Unpaid share: percentage of all invoices currently unpaid (status=SENT), plus a sparkline with month tooltips (toggle 6 or 12 months; default 12). Tooltip format: e.g., "Jun ’25 • 3.8% unpaid".
- Expected next 30 days: shows CHF/EUR totals plus a mini CHF vs EUR ratio bar; includes an info icon explaining the forecast method.

## Roadmap / Next Steps
- Implement Google SSO
- Toast notifications for form successes and errors
- Invoice form: invoice date, due date, tax/VAT options
- Download PDF action in invoices list using current QR options
- Additional UI polish and accessibility
