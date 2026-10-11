import { query } from "./db";

let ready: Promise<void> | null = null;

const statements = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    account_id TEXT UNIQUE NOT NULL,
    family_id TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id)`,
  `CREATE TABLE IF NOT EXISTS family_memberships (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    family_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_family_memberships_family_id ON family_memberships(family_id)`,
  `CREATE TABLE IF NOT EXISTS family_invitations (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_family_invitations_family_email ON family_invitations(family_id,email)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS login_history (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    token_hash TEXT UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
  )`,
  `ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash) WHERE token_hash IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS issue_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'family' CHECK (visibility IN ('family','private')),
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS family_id TEXT`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'family'`,
  `CREATE INDEX IF NOT EXISTS idx_events_family_visibility ON events(family_id,visibility)`,
  `CREATE TABLE IF NOT EXISTS journal_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('family','private')),
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE journal_posts ADD COLUMN IF NOT EXISTS family_id TEXT`,
  `ALTER TABLE journal_posts ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'`,
  `ALTER TABLE journal_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `CREATE INDEX IF NOT EXISTS idx_journal_family_visibility ON journal_posts(family_id,visibility)`,
  `CREATE TABLE IF NOT EXISTS health_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('family','private')),
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE health_records ADD COLUMN IF NOT EXISTS family_id TEXT`,
  `ALTER TABLE health_records ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'`,
  `ALTER TABLE health_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `CREATE INDEX IF NOT EXISTS idx_health_family_visibility ON health_records(family_id,visibility)`,
  `CREATE TABLE IF NOT EXISTS preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id TEXT,
    name TEXT NOT NULL,
    role TEXT,
    birthday DATE,
    type TEXT,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE family_members ADD COLUMN IF NOT EXISTS family_id TEXT`,
  `ALTER TABLE family_members ADD COLUMN IF NOT EXISTS data_json JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE family_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id)`,
  `CREATE TABLE IF NOT EXISTS auth_rate_limits (
    key_hash TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `INSERT INTO families(id,name,created_by)
    SELECT DISTINCT u.family_id, 'My Family', min(u.id)
    FROM users u
    WHERE u.family_id IS NOT NULL
    GROUP BY u.family_id
    ON CONFLICT (id) DO NOTHING`,
  `INSERT INTO family_memberships(user_id,family_id,role)
    SELECT u.id,u.family_id,
      CASE WHEN u.id=(SELECT min(u2.id) FROM users u2 WHERE u2.family_id=u.family_id) THEN 'owner' ELSE 'member' END
    FROM users u
    ON CONFLICT (user_id) DO NOTHING`,
  `UPDATE events e SET family_id=u.family_id FROM users u WHERE e.user_id=u.id AND e.family_id IS NULL`,
  `UPDATE journal_posts j SET family_id=u.family_id FROM users u WHERE j.user_id=u.id AND j.family_id IS NULL`,
  `UPDATE health_records h SET family_id=u.family_id FROM users u WHERE h.user_id=u.id AND h.family_id IS NULL`,
  `UPDATE family_members f SET family_id=u.family_id FROM users u WHERE f.user_id=u.id AND f.family_id IS NULL`,
  `INSERT INTO schema_migrations(version) VALUES('0001_family_release') ON CONFLICT (version) DO NOTHING`,
];

export function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    for (const sql of statements) await query(sql);
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
