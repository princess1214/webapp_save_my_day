# Family release integration audit

## Pull request relationship and decisions

- **PR #12** added the first auth/API scaffold on top of an older `main`. Its useful route inventory and scrypt-based password approach were retained conceptually, but its database adapter was a no-op, signup trusted a client `inviteFamilyId`, reset links were logged, and several routes lacked complete authorization.
- **PR #13** is one commit on top of PR #12 rather than `main`. It improved per-user password salts and attempted D1 persistence/email, but its SQLite/D1 schema conflicted with the PostgreSQL/Vercel backend later merged through PRs #14/#15. Current `main` supersedes its storage adapter; this integration preserves its useful salted-password and persistence intent on PostgreSQL.
- **PR #16** is based on current `main`. Its Calendar search panel, category dots/color consistency, and creator display were ported. Its family-wide update/delete SQL was replaced with creator-or-family-manager authorization; creator identity is server-derived. The reviewed search scrolling and bottom safe-area regressions were fixed rather than copied.
- **PR #9** proposed Next.js `15.2.8`. Current `main` already used that version, and the current advisory audit showed it is no longer sufficient. The integration upgrades within Next 15 to `15.5.27` instead of replaying PR #9 or its large stale lockfile rewrite.

None of the existing pull requests are merged or closed by this work.

## Backend decision

PostgreSQL is the only persistence backend. It already powers the working Vercel-oriented code on `main`, supports transactions and relational authorization, and avoids a second Cloudflare deployment/runtime. Missing `DATABASE_URL` is a hard error; there is no production in-memory fallback.

## Security and access model

- Raw session, reset, and invitation tokens are never stored; the database receives an HMAC digest.
- Passwords use per-account random salts and Node `scrypt`, with timing-safe verification.
- Session cookies are HTTP-only, `SameSite=Strict`, secure in production, and invalidated in PostgreSQL on logout.
- Signup creates a new family unless a valid, unexpired, email-bound invitation token is supplied.
- Calendar items default to family visibility. Read access is creator-or-same-family-shared; mutation is creator or same-family owner/admin.
- Journal and Health default to private. Shared records can be read inside the family, but only their creator can mutate them.
- Profile and preferences are always scoped to the authenticated account.
- Dependent family profiles are scoped to the authenticated family.
- Authentication endpoints use PostgreSQL-backed IP rate limits.
- Password reset fails clearly when email is unconfigured or delivery fails, without returning or logging a raw token.

## Local data import

On authenticated cloud hydration, meaningful Zustand data is copied to `assistmyday-local-backup-<account>` before the UI is replaced with cloud state. The user can explicitly import it. Import uses `ON CONFLICT DO NOTHING` for records and merge semantics where existing cloud profile/preferences win. The local backup is not deleted automatically.

## Acceptance checklist

Automated policy tests cover same-family shared reads, cross-family denial, private Journal/Health defaults, invalid invitations, PWA files, and all five page entry points. The production build checks page compilation.

Before family onboarding, run credentialed integration checks against a non-production database:

1. Create two adults in Family A and one adult in Family B.
2. Verify Family A member B can read member A's shared event.
3. Verify Family B receives 404 for that event's GET, PUT, and DELETE.
4. Verify Family A member B cannot read A's private Journal or Health records.
5. Verify a wrong-email, expired, revoked, and already-used invitation cannot join.
6. Log out and verify the old cookie is rejected; sign in from a second browser and verify persisted data.
7. Exercise create/update/delete in Calendar, Journal, Health, Profile, preferences, and dependent family members.
8. Request a real reset email and verify provider delivery and single-use token behavior.

## Backup/recovery

Enable provider-managed daily backups and point-in-time recovery. Perform restore drills into an isolated database, validate row counts and family isolation, and only then move the Vercel `DATABASE_URL`. Never test destructive recovery against the live family database.
