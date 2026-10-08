import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

const SESSION_COOKIE = "assistmyday_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  family_id: string;
  account_id: string;
  email: string;
  family_role: "owner" | "admin" | "member";
};

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("Missing AUTH_SECRET");
  }
  return secret || "assistmyday-local-development-only";
}

export function digestToken(token: string) {
  return crypto.createHmac("sha256", authSecret()).update(token).digest("hex");
}

export function makeAccountId() {
  const value = crypto.randomBytes(6).readUIntBE(0, 6) % 10_000_000_000_000;
  return Math.floor(value).toString().padStart(13, "0");
}

export function makeFamilyId() {
  return `fam_${crypto.randomBytes(9).toString("base64url")}`;
}

export async function hashPassword(password: string, salt?: string) {
  const nextSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, nextSalt, 64, (error, key) =>
      error ? reject(error) : resolve(key)
    );
  });
  return { salt: nextSalt, hash: hash.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  try {
    const { hash } = await hashPassword(password, salt);
    const actual = Buffer.from(hash, "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function requireSessionUser(): Promise<SessionUser | null> {
  await ensureSchema();
  const rawToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;
  const sessionId = digestToken(rawToken);
  const result = await query<SessionUser>(
    `SELECT u.id,u.family_id,u.account_id,u.email,
      COALESCE(m.role,'member') AS family_role
     FROM sessions s
     JOIN users u ON u.id=s.user_id
     LEFT JOIN family_memberships m ON m.user_id=u.id AND m.family_id=u.family_id
     WHERE s.id=$1 AND s.expires_at > now()`,
    [sessionId]
  );
  return result.rows[0] ?? null;
}

export async function createSession(userId: string) {
  await ensureSchema();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const sessionId = digestToken(rawToken);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS);
  await query("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,$3)", [
    sessionId,
    userId,
    expires,
  ]);
  (await cookies()).set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSession() {
  await ensureSchema();
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) await query("DELETE FROM sessions WHERE id=$1", [digestToken(rawToken)]);
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function insertLoginHistory(userId: string | null, success = true) {
  const requestHeaders = await headers();
  const data = {
    userAgent: requestHeaders.get("user-agent"),
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    success,
  };
  await query("INSERT INTO login_history(id,user_id,data_json) VALUES($1,$2,$3)", [
    crypto.randomUUID(),
    userId,
    data,
  ]);
}
