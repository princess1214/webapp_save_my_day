import { query } from "./db";

let ready: Promise<void> | null = null;

export function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    await query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      account_id TEXT UNIQUE NOT NULL,
      family_id TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id)`);

    await query(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE TABLE IF NOT EXISTS login_history (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,data_json JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ)`);
    await query(`CREATE TABLE IF NOT EXISTS issue_reports (id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE SET NULL,data_json JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);

    await query(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,family_id TEXT NOT NULL,data_json JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE TABLE IF NOT EXISTS journal_posts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,data_json JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE TABLE IF NOT EXISTS health_records (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,data_json JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE TABLE IF NOT EXISTS preferences (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data_json JSONB NOT NULL DEFAULT '{}'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE TABLE IF NOT EXISTS family_members (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,role TEXT,birthday DATE,type TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}
