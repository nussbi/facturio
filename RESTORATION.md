# Historical restoration notes

This records the initial restoration. The partial-repository status described below is superseded by the full source synchronization documented in README.md and SOURCE-SYNC.md.

# Facturio recovered application source

This archive contains the full recovered application source used for the production restoration, not just the partial GitHub snapshot. Credentials, local databases, invoice records, logs, caches, and node_modules are excluded.

## Architecture
- nussbi/facturio-landing powers the Cloudflare Pages marketing sites: facturio.ch and staging.facturio.ch. These bindings are intentional and must not be redirected to the application repository.
- The app uses a separate Cloudflare Worker named facturio, with app.facturio.ch and sign.facturio.ch as custom domains.
- Production bindings: D1 facturio-db and private R2 facturio-invoices.
- The separate staging Worker facturio-staging uses staging databases/storage and is unchanged.

## Recovery changes
- Recovered the missing Next.js pages, API routes, components, public assets and build configuration from the user-owned hermes backup.
- Fixed the malformed useEffect closure in src/components/PortalShareButton.tsx. The asynchronous function now runs, and cleanup is returned from the effect.
- Rebuilt using the existing Next.js 15.5.27/OpenNext dependency versions; no database migrations, seeds, or invoice modifications were performed.
- The existing build config skips TypeScript and ESLint checks; successful production build is not a clean lint/type-check certification.
- OpenNext flags Next.js 15 as unsupported. Restoration retains the app's existing major version to avoid an unrelated framework migration. Plan a supported-version upgrade separately.

## Reproducible build
Use the lockfile, generate the Prisma client, and build using OpenNext. The current adapter requires its --dangerouslyUseUnsupportedNextVersion flag for this existing Next.js version. Production deployment uses wrangler.jsonc and a separate JSON secrets file; never place secrets in configuration or GitHub. See .env.example for variable names.

## Secrets
The user approved a new production SECRET_KEY, which requires users to sign in again and can invalidate old HMAC-signed invoice links. The reminder key is also new. The invoice-archive key and email API key were recovered. The Google OAuth secret and Stripe secrets were not available and require secure reconfiguration before those integrations work.

## GitHub handoff
The current nussbi/facturio main branch contains only a partial source snapshot. This archive is the complete source handoff for the other recovery agent. GitHub main has not been overwritten; merge the missing source with any concurrent work before setting up automated app deployments. Neither Pages marketing project should be repointed.

## Subsequent deprecation-name update
The staging Worker and Pages project are now named facturio-staging-deprecated. Their existing staging custom domains remain active. The staging Wrangler configuration uses the new Worker name. The active production database-backup Worker keeps its original name; the historical GitHub repository is now nussbi/facturiobackuplastyear-deprecated. Production Worker/Pages and the current facturio/facturio-landing repositories retain their names.

## Customer invoice portal fix
Valid non-expiring shares now pass the same validation for the portal and PDF endpoints. Revoked, expired, malformed, unknown and cross-customer access remain denied. The customer portal includes invoice filters, balances, PDF preview and attachment download. Existing token hashes are no longer exposed as broken links in the contact UI; replacement is explicit and requires confirmation. No database migration or invoice modification is required. Seven regression tests cover validation, ownership, invoice scope and application-log token redaction. The Google OAuth secret was subsequently installed securely in Cloudflare and login was confirmed by the user; no credential is present in this source archive.


## Portal-link audit and continuity fix — 2026-11-07
- Audited every PortalShare record in production D1: one active, non-expiring share; no revoked or expired shares; customer/issuer ownership matches.
- The reported 64-character hexadecimal URL was the stored SHA256 hash of the customer's valid original bearer token. Hash URLs are not accepted as access credentials.
- Customer portal GET now returns a stable, server-signed v1 link. The signature binds the share ID, issuer, contact and current token hash, using SECRET_KEY with no insecure fallback. Existing raw bearer tokens remain supported and unchanged.
- Invoice sends/resends reuse the current share instead of rotating its hash. Revoked or expired shares are not reactivated by resending an invoice; those emails omit the portal CTA.
- Explicit link replacement still rotates the hash and invalidates prior raw and signed links. SECRET_KEY rotation invalidates signed v1 links; it does not change the stored original-token hashes.
- Contact UI reloads current links without caching and clears stale link state when switching contacts.
- No database migrations or portal record edits. Production credentials, bindings, custom domains and daily cron preserved.
- Thirteen regression tests pass; Next.js/OpenNext production build passes. Existing build configuration skips TypeScript/lint certification.
- Live browser checks after deployment: existing original-token portal HTTP 200; invoice PDF preview and attachment HTTP 200, 11,630 bytes each; exposed hash URL and tampered signed URL HTTP 404; unauthenticated contact portal API HTTP 401.
- Successful signed-token resolution and resend continuity are covered by automated tests against all current share data; authenticated contact UI retrieval was not tested end-to-end because this browser is not signed in. No invoice email was sent for testing.
- Historical tokens that were overwritten before this audit cannot be reconstructed from hashes. This verifies all currently stored shares, not all possible past emails.
- Production Worker version: b4f21cc4-218d-4cf3-a7ae-786944c410f4.
