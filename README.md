# AssistMyDay

## Environment variables
Copy `.env.example` to `.env.local` and set:
- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_BASE_URL`
- `EMAIL_PROVIDER_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_API_BASE_URL`

## Local development
1. `pnpm install`
2. Create a PostgreSQL database and set `DATABASE_URL`.
3. Start app: `pnpm dev`
4. First API/auth request auto-runs schema creation in `lib/server-db.ts`.

## Database schema / migrations
Current schema is initialized in `initDb()` (users, sessions, password_reset_tokens, family_members, events, journal_posts, health_records, preferences, issue_reports, login_history). For production, run startup once after deploy to ensure all tables exist.

## Vercel deployment
1. Add all env vars from `.env.example` in Vercel project settings.
2. Use Vercel Postgres (or any Postgres) and set `DATABASE_URL`.
3. Deploy.
4. Hit `/api/auth/session` once to trigger table initialization.

## Manual test checklist
- Sign up user and verify login.
- Create/update/delete event, journal, health record, family member, and preferences.
- Clear localStorage and login again; verify data loads from backend.
- Trigger forgot password and verify reset link email and password update.
- Create invited signup with `inviteFamilyId`; verify different `accountId`, shared `familyId`.
