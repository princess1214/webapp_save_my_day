import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/server/auth";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || "").toLowerCase();
  const password = String(body.password || "");
  const user = await query<{ id: string; password_salt: string; password_hash: string; data_json: any }>("SELECT id,password_salt,password_hash,data_json FROM users WHERE email=$1", [email]);
  const row = user.rows[0];
  if (!row) return NextResponse.json({ message: "Invalid email or passcode" }, { status: 401 });
  const hashed = await hashPassword(password, row.password_salt);
  if (hashed.hash !== row.password_hash) return NextResponse.json({ message: "Invalid email or passcode" }, { status: 401 });
  await createSession(row.id);
  return NextResponse.json({ success: true, user: { email, ...(row.data_json || {}) } });
}
