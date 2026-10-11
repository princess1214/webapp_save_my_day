# AssistMyDay

AssistMyDay is a private, mobile-friendly family organizer with Home, Calendar, Health, Journal, and Profile modules. The family release uses one PostgreSQL backend for accounts, sessions, family membership, invitations, and module data.

## Local setup

1. Install Node.js 20+ and pnpm.
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Create a PostgreSQL database.
4. Run `pnpm install` and `pnpm dev`.

The idempotent schema bootstrap runs on the first authenticated API request. For controlled production releases, run `migrations/0001_family_release.sql` against the database before deployment.

## Environment variables

- `DATABASE_URL` — PostgreSQL connection string. Required; production never falls back to memory.
- `AUTH_SECRET` — random secret used to HMAC session, reset, and invitation tokens. Required in production.
- `APP_BASE_URL` — canonical HTTPS deployment origin used in email links.
- `EMAIL_PROVIDER_API_KEY` — Resend-compatible API key for reset and invitation email.
- `EMAIL_FROM` — verified sender address.
- `NEXT_PUBLIC_API_BASE_URL` — optional; leave empty for the recommended same-origin `/api` default.

## Vercel deployment

1. Create or select the Vercel project and connect this repository.
2. Provision a managed PostgreSQL database with automated backups and point-in-time recovery, then add `DATABASE_URL` to Production and Preview environments.
3. Add a unique `AUTH_SECRET` (32+ random bytes), the HTTPS production `APP_BASE_URL`, and the verified email provider values.
4. Apply `migrations/0001_family_release.sql` using the provider SQL console or a migration job.
5. Deploy and verify `/manifest.webmanifest`, `/icon-192.png`, and `/icon-512.png`.
6. Create two test families and complete the isolation checklist in `docs/FAMILY_RELEASE.md` before inviting family members.

Do not enable a service worker that caches `/api` responses. This release intentionally omits offline data synchronization and push notifications.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --prod
```

Database and email delivery tests require real external credentials. When those are unavailable, the unit, type, lint, manifest, and production build checks still run locally; do not interpret them as proof that provider operations succeeded.

## Backup and recovery

Use a PostgreSQL plan with daily backups and point-in-time recovery. Test a restore into a separate database before family onboarding and quarterly thereafter. Keep the original database read-only during a recovery, update `DATABASE_URL` only after validation, and retain the last known-good backup through the validation window. The local import flow also saves a per-account browser backup before cloud hydration and never deletes it automatically.
