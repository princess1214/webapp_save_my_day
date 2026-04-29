import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

const SESSION_COOKIE = "assistmyday_session";
export type SessionUser = { id: string; family_id: string; account_id: string; email: string };

export async function hashPassword(password: string, salt?: string) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => crypto.scrypt(password, s, 64, (e, k) => (e ? reject(e) : resolve(k.toString("hex")))));
  return { salt: s, hash };
}

export async function requireSessionUser(): Promise<SessionUser | null> {
  await ensureSchema();
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const r = await query<SessionUser>(`SELECT u.id,u.family_id,u.account_id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at > now()`, [sid]);
  return r.rows[0] ?? null;
}

export async function createSession(userId: string) {
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await query("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,$3)", [id, userId, expires]);
  (await cookies()).set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", expires });
}

export async function clearSession() {
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (sid) await query("DELETE FROM sessions WHERE id=$1", [sid]);
  (await cookies()).delete(SESSION_COOKIE);
}

export async function insertLoginHistory(userId: string) {
  const id = crypto.randomUUID();
  const h = await headers();
  const data = { userAgent: h.get("user-agent"), ip: h.get("x-forwarded-for") || null };
  await query("INSERT INTO login_history(id,user_id,data_json) VALUES($1,$2,$3)", [id, userId, data]);
}
