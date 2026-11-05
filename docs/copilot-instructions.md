# Facturio AI Coding Instructions

## Project Overview
Facturio is a Next.js 15 invoicing application with Swiss QR-bill generation, SQLite/PostgreSQL database, and custom session-based authentication. The app uses App Router architecture with strict multi-tenant data isolation.

## Architecture Patterns

### Multi-Tenant Data Isolation
**Critical**: All business entities (Contacts, Invoices, Expenses) are scoped by `userId`. Every API route and database query MUST filter by authenticated user:
```typescript
// ✅ Correct - user-scoped queries
const invoices = await prisma.invoice.findMany({ where: { userId: user.id } });

// ❌ Wrong - global queries expose all data
const invoices = await prisma.invoice.findMany();
```

### Authentication & Sessions
- Custom HMAC-signed session cookies (`tellbill_session`) managed in `src/server/auth.ts`
- Use `getCurrentUser()` in API routes and server components for authentication
- Admin users: `nussbaumer@gmail.com` or `role=ADMIN`
- All pages except `/login` require authentication via middleware routing

### Database & Prisma
- Prisma client generated to `src/generated/prisma` 
- Production uses PostgreSQL, development uses SQLite
- User isolation enforced at the Prisma query level, not database constraints
- Invoice numbering: sequential per-user with fallback to ID-based stable codes

## Development Workflows

### Database Operations
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Run migrations
npm run migrate

# Seed test data
npm run seed:test-invoices    # 1,000 historical invoices
npm run seed:strongwinds      # Company setup
npm run seed:expenses         # Per-customer expenses
```

### QR-Bill Generation
- Built-in Swiss QR-bill generation via `swissqrbill` library in `src/lib/qrbill.ts`
- Two PDF modes: `A4_PORTRAIT_SHEET` (full invoice) or `QR_BILL_ONLY` 
- Documents persistently stored in `documents/invoices/{userId}/inv{code}.{pdf,svg,jpg}`
- PDF endpoint serves existing files when available, generates and saves new ones otherwise
- Live preview generation during invoice creation

### Form Validation Patterns
The project uses **manual validation** (no React Hook Form or Zod):
```typescript
// Standard validation pattern
function validate() {
  const e: Record<string, string> = {};
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) 
    e.email = "Valid email is required";
  if (!form.street) e.street = "Street is required";
  setErrors(e);
  return Object.keys(e).length === 0;
}

// In JSX - conditional error styling
<input 
  className={`${input} ${errors.email ? " border-red-500 ring-2 ring-red-200" : ""}`}
  value={form.email}
  onChange={e => setForm({...form, email: e.target.value})}
/>
{errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
```

## Component Conventions

### UI Components
- Custom design system in `src/components/ui/` (Button, Card, Table, Toast)
- Uses `class-variance-authority` for component variants
- Tailwind CSS v4 with light-only theme
- Brand gradient: `from-indigo-600 via-blue-600 to-cyan-500`

### State Management
- React useState for form state
- useTransition for async operations
- Toast notifications via custom `useToast()` hook
- No external state management library

### API Route Patterns
```typescript
// Standard API route structure
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const data = await prisma.someModel.findMany({ where: { userId: user.id } });
  return NextResponse.json({ data });
}
```

## Key File Locations

### Core Architecture
- `src/server/auth.ts` - Session management and user authentication
- `src/middleware.ts` - Subdomain routing (app.facturio.ch → `/app/*`)
- `prisma/schema.prisma` - Database schema with user isolation patterns

### Business Logic
- `src/lib/qrbill.ts` - Swiss QR-bill PDF/SVG generation
- `src/app/app/api/` - All authenticated API routes
- `src/components/InvoiceForm.tsx` - Complex invoice creation with live preview

### Deployment
- `deploy-simple.sh` - PM2-based deployment (recommended)
- `ecosystem.config.json` - PM2 configuration
- Production uses PostgreSQL with proper migrations

## Project-Specific Patterns

### Invoice Number Formatting
```typescript
// 9-digit grouped format: inv000-123-456
function formatInvCode(id: string, number?: number | null): string {
  if (number) return number.toString().padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
  // Fallback for missing numbers
  return id.slice(-9).padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
}
```

### Swiss Address Validation
```typescript
// Country-specific ZIP validation
if ((form.country === "CH" || form.country === "AT") && !/^\d{4}$/.test(form.zipCode)) 
  e.zipCode = "Swiss/Austrian ZIP must be 4 digits";
else if (form.country === "DE" && !/^\d{5}$/.test(form.zipCode)) 
  e.zipCode = "German ZIP must be 5 digits";
```

### VAT Handling
- OrgProfile.defaultVat prefills new invoice VAT rates
- VAT precedence: last customer invoice → org default → 0%
- Country-specific VAT options in ProfileForm

## Common Gotchas

- Always include userId filters in Prisma queries for user data
- Prisma client import: `import { prisma } from "@/server/db"`
- Use `suppressHydrationWarning` on form inputs to prevent SSR mismatches
- PDF generation requires `runtime = "nodejs"` in API routes
- Deploy with `deploy-simple.sh` for production (not Docker on ARM64)

## Testing Data
Use `npm run seed:test-invoices` to generate 1,000 realistic invoices with proper payment patterns, currency distribution, and QR-bill formats for testing dashboard metrics and invoice workflows.