import { cookies } from "next/headers";
import crypto from "crypto";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

const SESSION_COOKIE = "assistmyday_session";

export async function hashPassword(password: string, salt?: string) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, s, 64, (err, key) => (err ? reject(err) : resolve(key.toString("hex"))));
  });
  return { salt: s, hash };
}

export async function requireUserId() {
  await ensureSchema();
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const r = await query<{ user_id: string }>("SELECT user_id FROM sessions WHERE id=$1 AND expires_at > now()", [sid]);
  return r.rows[0]?.user_id ?? null;
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
