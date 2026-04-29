import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/server-db";
import { hashPassword, hashToken } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  await initDb();
  const body = await request.json().catch(() => ({}));
  const token = String(body?.token || "");
  const password = String(body?.password || "");
  if (!token || password.length < 8) return NextResponse.json({ message: "Invalid token or password" }, { status: 400 });
  const result = await db.execute({ sql: "SELECT account_id FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at > ? LIMIT 1", args: [hashToken(token), new Date().toISOString()] });
  const row: any = result.rows[0];
  if (!row) return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
  const nextPassword = hashPassword(password);
  await db.batch([
    { sql: "UPDATE users SET password_salt=?, password_hash=?, updated_at=? WHERE account_id=?", args: [nextPassword.salt, nextPassword.hash, new Date().toISOString(), row.account_id] },
    { sql: "UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?", args: [new Date().toISOString(), hashToken(token)] },
  ], "write");
  return NextResponse.json({ success: true, message: "Password reset accepted." });
}
