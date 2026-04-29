PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  birthday TEXT,
  role TEXT,
  family_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS families (
  family_id TEXT PRIMARY KEY,
  created_by_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (created_by_account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS family_memberships (
  family_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  role_in_family TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (family_id, account_id),
  FOREIGN KEY (family_id) REFERENCES families(family_id),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS family_profiles (
  member_id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  member_type TEXT NOT NULL,
  birthday TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (family_id) REFERENCES families(family_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  event_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  family_id TEXT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  reminder_minutes INTEGER,
  member_ids_json TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_posts (
  post_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  family_id TEXT,
  visibility TEXT NOT NULL,
  target_member_ids_json TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_records (
  record_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  family_id TEXT,
  member_id TEXT,
  metric TEXT,
  category TEXT,
  value TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

CREATE TABLE IF NOT EXISTS login_history (
  login_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  ip TEXT,
  location TEXT,
  user_agent TEXT,
  device_os TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);
