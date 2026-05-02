import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/server/auth";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  const t = await query<{ user_id: string }>("SELECT user_id FROM password_reset_tokens WHERE token=$1 AND used_at IS NULL AND expires_at > now()", [token]);
  const row = t.rows[0];
  if (!row) return NextResponse.json({ message: "Invalid token" }, { status: 400 });
  const { salt, hash } = await hashPassword(String(password || ""));
  await query("UPDATE users SET password_hash=$1,password_salt=$2 WHERE id=$3", [hash, salt, row.user_id]);
  await query("UPDATE password_reset_tokens SET used_at=now() WHERE token=$1", [token]);
  return NextResponse.json({ success: true });
}
