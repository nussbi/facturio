# Security

## No secrets in this repository

This repository contains **no credentials**. Every secret is supplied at deploy time via `wrangler secret put` or the Cloudflare dashboard. `.gitignore` blocks `.env*`, `*.env`, `*.pem`, `*.key`, `secrets/` and local databases.

## ⚠️ Credential rotation required

The source snapshot this repository was recovered from (`hermesbackup`) contained **live credentials in plaintext** in `.env` files. Those files were **deliberately excluded** from this repository, but the values must be treated as **compromised** and rotated immediately:

| Credential | Where to rotate |
|---|---|
| Cloudflare API token | Cloudflare dashboard → My Profile → API Tokens → Roll |
| R2 access key / secret | Cloudflare dashboard → R2 → Manage R2 API Tokens |
| Resend API key | Resend dashboard → API Keys |
| NVIDIA NIM API keys (build + parse) | NVIDIA build portal |
| xAI (Grok) API key | xAI console |
| Explee API key | Explee dashboard |
| OpenSEO API key | OpenSEO dashboard |
| Telegram bot token | @BotFather → /revoke |
| `INVOICE_ARCHIVE_SECRET` | Regenerate (random 32-byte hex) and update the Worker secret |
| `SECRET_KEY` (session HMAC) | Regenerate and update the Worker secret |

After rotating, update the corresponding Worker secrets so the app keeps working.

## Reporting a vulnerability

Email **security@facturio.ch** (or the maintainer directly). Please do not open a public issue for security problems.

## Hardening backlog

- Remove the `dev-secret-change-me` fallback in `src/server/auth.ts` — fail closed when `SECRET_KEY` is unset.
- Enable HSTS on the zone.
- Turn off `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` in `next.config.ts`.
- Add automated D1 backups/exports.
