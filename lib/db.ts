import { Pool } from "pg";

let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params);
}
