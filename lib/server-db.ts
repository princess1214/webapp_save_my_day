type Query = { sql: string; args?: any[] };

type DbResult = { rows: any[] };

type D1Result = { results?: any[] };

function getD1() {
  const binding = (globalThis as any).DB || (process as any).env?.DB;
  if (!binding) throw new Error("Missing Cloudflare D1 binding `DB`");
  return binding;
}

async function run(q: Query): Promise<DbResult> {
  const stmt = getD1().prepare(q.sql).bind(...(q.args || []));
  const res = (await stmt.all()) as D1Result;
  return { rows: res.results || [] };
}

export const db = {
  execute: run,
  async batch(queries: Query[]): Promise<DbResult[]> {
    const stmts = queries.map((q) => getD1().prepare(q.sql).bind(...(q.args || [])));
    const results = await getD1().batch(stmts);
    return results.map((r: D1Result) => ({ rows: r.results || [] }));
  },
};

let initialized = false;
export async function initDb() {
  if (initialized) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (account_id TEXT PRIMARY KEY, family_id TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_salt TEXT, password_hash TEXT NOT NULL, full_name TEXT, display_name TEXT, birthday TEXT, role TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS family_members (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, family_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, family_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS journal_posts (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, family_id TEXT NOT NULL, visibility TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS health_records (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, family_id TEXT NOT NULL, visibility TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS preferences (account_id TEXT PRIMARY KEY, family_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS issue_reports (id TEXT PRIMARY KEY, account_id TEXT, family_id TEXT, email TEXT, issue_text TEXT, device_info TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS login_history (id TEXT PRIMARY KEY, account_id TEXT, email TEXT, ip TEXT, user_agent TEXT, success INTEGER NOT NULL, created_at TEXT NOT NULL)`,
  ];
  for (const sql of statements) await db.execute({ sql });
  initialized = true;
}
