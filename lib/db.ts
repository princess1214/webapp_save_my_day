let pool: any = null;

async function getPgPool() {
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  if (pool) return pool;
  const req = eval("require") as NodeRequire;
  let pg: any;
  try {
    pg = req("pg");
  } catch {
    throw new Error('Missing "pg" dependency at runtime. Install pg in deployment environment.');
  }
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false } });
  return pool;
}

export async function query<T = any>(text: string, params: unknown[] = []) {
  const p = await getPgPool();
  return p.query(text, params) as Promise<{ rows: T[]; rowCount: number }>;
}
