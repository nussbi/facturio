# Signing update

Signing pages and recipient controls support English, German, French and Italian. Shared PDF editing uses a browser-safe field geometry module, a same-version local PDF.js worker, larger draggable/resizable fields, fit-width/zoom/fullscreen controls and a wider signing workspace.

Standalone uploads require account ownership or an HMAC-signed HttpOnly guest capability. Step two renders the PDF and persists field placement; step three validates the recipient and performs Resend delivery. Staging is link-only and never emails. Delivery claims are conditional and failed email attempts restore the draft. Guest completion invites signup/login without requiring an account to send or sign.

Signed account documents appear on customer records by explicit customer linkage, or an unambiguous recipient-email match within the same account. Archived signed PDFs support viewing/downloading; unsigned originals are not represented as signed PDFs. Existing invoice portal logic and analytics are unchanged.

Verification: 37 unit/regression tests pass; TypeScript no-emit validation passes; production Cloudflare bundle builds. Browser verification on isolated Workers/D1/R2 proves two-page PDF rendering, page-two field placement, keyboard move/resize, save/send, guest invitations and completed signed PDF image placement. Authenticated API tests prove customer association, signed PDF download and EN/DE/FR/IT rendering. Cloudflare security challenges prevented direct public-host browser verification; no security controls were weakened. No real test emails were sent and no customer production records were modified.

## Guest sender email follow-up

Anonymous senders enter their email on step three without registering. The validated address is the Reply-To header and is shown as reply information in the localized recipient email; From stays the configured verified Facturio address. Logged-in senders use account/profile details rather than guest-supplied overrides. Missing, invalid or header-injection guest addresses are rejected before a draft is claimed or any email is sent. All 41 signing, portal and branding regression tests pass.
