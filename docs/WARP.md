# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Quick Start
```bash
npm run migrate      # Run Prisma migrations (first time only)
npm run dev          # Start Next.js dev server with Turbopack
```

### Database Operations
```bash
npm run migrate                    # Apply migrations and generate Prisma client
npx prisma db push                # Push schema changes without migration
npx prisma studio                 # Open Prisma Studio database browser
npx prisma generate               # Regenerate Prisma client only
```

### Testing & Quality
```bash
npm run lint                      # Run ESLint
npm run build                     # Build for production
npm start                        # Start production server
```

### Data Seeding & Utilities
```bash
npm run seed:org                  # Seed organization profile with IBAN
npm run seed:strongwinds          # Create/update Strongwinds GmbH customer
npm run seed:expenses             # Add sample expenses for customers
npm run seed:test-invoices        # Generate 1,000 historical test invoices
```

### Single Test Commands
For focused development, you can run individual components:
- Test a single API route: `curl http://localhost:3000/api/contacts`
- Run specific migration: `npx prisma migrate dev --name migration_name`

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router) with React 19, Tailwind CSS v4
- **Backend**: Next.js API routes with TypeScript
- **Database**: SQLite with Prisma ORM
- **QR-Bill Generation**: Node.js library (swissqrbill with PDFKit)
- **Authentication**: Custom session-based auth with Google/SwissID OAuth support

### Core Architecture Patterns

#### Multi-Tenant Data Isolation
All business entities (Contacts, Invoices, Expenses) are scoped by `userId`. Every API route and page automatically filters data by the authenticated user. New users start with empty datasets.

#### Authentication Flow
- Custom HMAC-signed session cookies (`tellbill_session`)
- Password hashing with crypto.scrypt and random salt
- OAuth support for Google and SwissID with PKCE
- Admin users: `nussbaumer@gmail.com` or `role=ADMIN`

#### QR-Bill Integration
- Built-in Node.js library (swissqrbill) for PDF/SVG generation
- Live preview generation during invoice creation
- No external service dependencies
- Multiple output formats: A4 sheets, QR-only, payment slips

### Data Model Structure

#### Key Entities
- **User**: Authentication, role management, profile completion tracking
- **OrgProfile**: Per-user creditor details (company info, IBAN, default VAT)
- **Contact**: Customer records with address, IBAN, currency preferences
- **Invoice**: Multi-currency invoicing with QR-bill options, status tracking
- **Expense**: Time/item tracking, billable status, customer assignment
- **InvoiceItem**: Line items linking expenses to invoices

#### Business Logic
- **VAT Prefill Priority**: Last customer invoice → OrgProfile.defaultVat → 0%
- **Invoice Numbering**: Auto-incremented per user with unique constraints
- **Currency Support**: CHF (primary) and EUR with separate calculations
- **Payment Terms**: 10/15/30/90 days or specific dates with due date tracking

### File Structure

#### API Routes (`src/app/api/`)
- `contacts/route.ts`: CRUD operations for customer management
- `invoices/route.ts`: Invoice creation, updates, status changes
- `expenses/route.ts`: Expense tracking and billable item management
- `qrbill/route.ts`: QR-bill generation endpoint using swissqrbill library
- `search/route.ts`: Global search across customers and invoices

#### Components (`src/components/`)
- **UI System**: `ui/Button.tsx`, `ui/Card.tsx`, `ui/Table.tsx`, `ui/Toast.tsx`
- **Forms**: Contact, Invoice, Expense, and Organization profile forms
- **QR Integration**: QR preview, download buttons, options configuration
- **Business Logic**: Payment tracking, service status, search functionality

#### Server-Side (`src/server/`)
- `auth.ts`: Session management, password hashing, OAuth helpers
- `db.ts`: Prisma client configuration and connection
- `mailer.ts`: Email utilities for notifications

#### Data Services (`src/lib/`)
- `openplz.ts`: Swiss/European address validation with caching
- `qrbill.ts`: QR-bill generation using swissqrbill Node.js library
- `metrics.ts`: Dashboard analytics and payment forecasting

### Development Notes

#### Environment Requirements
- Node.js LTS
- Environment variables in `.env.local` (copy from `.env.example`)

#### Key Environment Variables
- `DATABASE_URL`: SQLite file path (default: `file:./prisma/dev.db`)
- `SECRET_KEY`: HMAC signing key for sessions
- OAuth credentials for Google/SwissID integration

#### Database Considerations
- SQLite database stored in `prisma/dev.db`
- Prisma client generates to `src/generated/prisma/`
- Run `npm run migrate` after schema changes

#### QR-Bill Generation
- Built-in Node.js library (swissqrbill) generates QR bills directly
- No external service required - always available
- Service status indicator kept for UI compatibility (always shows ready)
- Supports PDF and SVG output formats

#### Multi-Currency Design
- Separate calculations and display for CHF/EUR
- Currency-aware dashboard metrics and aging reports
- Exchange rate considerations handled at business logic level

This architecture supports rapid feature development while maintaining data isolation and Swiss compliance requirements for invoicing.
