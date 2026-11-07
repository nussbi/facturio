# Facturio application

Complete source for the Facturio invoice application, customer invoice portal, and document-signing application deployed on Cloudflare Workers.

## Production and staging

- `wrangler.jsonc`: production Worker `facturio`, serving the app and signing domains.
- `wrangler.staging.jsonc`: existing staging Worker `facturio-staging-deprecated`, serving the staging app and signing domains. The historical Worker name is preserved; it is still in use.
- Marketing pages are maintained separately in `nussbi/facturio-landing` and deployed through Cloudflare Pages.

The source includes the shared redesign, self-hosted branding assets, EN/DE/FR/IT language controls, customer portal implementation, and signed-link PDF viewing/download fix.

## Reproducible build and verification

Use Node.js 22 and install the exact dependencies from `package-lock.json` with `npm ci`. Generate Prisma with `npx prisma generate --schema prisma/schema.prisma`. Run the portal and branding regression tests with `node --test src/lib/customer-portal*.test.cjs src/lib/brand.test.cjs`.

The Cloudflare bundle is generated with `npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion`. The flag explicitly acknowledges the existing Next.js 15 support-window warning; a framework upgrade is a separate maintenance task. The existing Next build skips full type/lint validation, so a successful build is not a full type/lint certification.

Deployment uses the matching Wrangler configuration and `--keep-vars --autoconfig=false`. Never replace existing production secrets with example values. Database changes and destructive seed/cleanup scripts require separate review; they are not part of a routine deployment.

## Security and persistence

Secrets are excluded from this repository. Configure Google OAuth, application signing, email and other secrets through Cloudflare. `.env.example` contains configuration placeholders only. D1 and R2 bindings remain separate for production and staging.

Customer portals require no customer login and have no automatic expiry. Credentials are checked securely and scoped to the owning issuer/customer and published invoices. Explicitly replacing or revoking a portal credential invalidates its former links. Stored token hashes are never accepted as bearer credentials.

`SOURCE-MANIFEST.json` records the full synchronized source checksums. The manual source-sync workflow verifies the archive, tests, and build before committing, rejects a changed base commit, and does not deploy or modify production data. Legacy VPS documentation and earlier partial-snapshot files are retained for reference.
