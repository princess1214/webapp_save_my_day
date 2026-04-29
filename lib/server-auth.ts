import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { db, initDb } from "./server-db";

const SESSION_COOKIE = "assistmyday_session";
const SESSION_DAYS = 14;

export function makeAccountId() {
  return `${Math.floor(Math.random() * 10 ** 13)}`.padStart(13, "0").slice(0, 13);
}
export function makeFamilyId() {
  return Math.random().toString(36).slice(2, 8).toLowerCase();
}
export function hashPassword(password: string) {
  return crypto.scryptSync(password, process.env.AUTH_SECRET || "dev-secret", 64).toString("hex");
}
export function verifyPassword(password: string, hash: string) {
  return hashPassword(password) === hash;
}
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(accountId: string) {
  await initDb();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString();
  await db.execute({ sql: "INSERT INTO sessions (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)", args: [tokenHash, accountId, expires, now.toISOString()] });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(expires) });
}

export async function clearSession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await initDb();
    await db.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [hashToken(token)] });
  }
  c.delete(SESSION_COOKIE);
}

export async function getSessionUser(req?: NextRequest) {
  await initDb();
  const token = req?.cookies.get(SESSION_COOKIE)?.value || (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await db.execute({ sql: "SELECT s.account_id, u.family_id, u.email, u.full_name, u.display_name, u.birthday, u.role FROM sessions s JOIN users u ON u.account_id=s.account_id WHERE s.token_hash=? AND s.expires_at > ? LIMIT 1", args: [hashToken(token), new Date().toISOString()] });
  return result.rows[0] || null;
}
