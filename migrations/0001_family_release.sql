-- AssistMyDay family-release migration for PostgreSQL.
-- The application also applies these idempotent changes through lib/schema.ts.
BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS families (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS family_memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS family_invitations (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS family_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'family';
ALTER TABLE journal_posts ADD COLUMN IF NOT EXISTS family_id TEXT;
ALTER TABLE journal_posts ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE journal_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS family_id TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS family_id TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS data_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS auth_rate_limits (key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

INSERT INTO families(id,name,created_by)
SELECT DISTINCT u.family_id,'My Family',min(u.id) FROM users u GROUP BY u.family_id
ON CONFLICT (id) DO NOTHING;
INSERT INTO family_memberships(user_id,family_id,role)
SELECT u.id,u.family_id,CASE WHEN u.id=(SELECT min(u2.id) FROM users u2 WHERE u2.family_id=u.family_id) THEN 'owner' ELSE 'member' END
FROM users u ON CONFLICT (user_id) DO NOTHING;
UPDATE events e SET family_id=u.family_id FROM users u WHERE e.user_id=u.id AND e.family_id IS NULL;
UPDATE journal_posts j SET family_id=u.family_id FROM users u WHERE j.user_id=u.id AND j.family_id IS NULL;
UPDATE health_records h SET family_id=u.family_id FROM users u WHERE h.user_id=u.id AND h.family_id IS NULL;
UPDATE family_members f SET family_id=u.family_id FROM users u WHERE f.user_id=u.id AND f.family_id IS NULL;
INSERT INTO schema_migrations(version) VALUES('0001_family_release') ON CONFLICT (version) DO NOTHING;

COMMIT;
