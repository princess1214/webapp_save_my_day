import crypto from "crypto";
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/schema";
import { createSession, hashPassword } from "@/lib/server/auth";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json();
  const email = String(body.email || "").toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return NextResponse.json({ message: "email and password required" }, { status: 400 });
  const existing = await query("SELECT 1 FROM users WHERE email=$1", [email]);
  if (existing.rowCount) return NextResponse.json({ message: "already exists" }, { status: 409 });
  const { salt, hash } = await hashPassword(password);
  const id = crypto.randomUUID();
  const data = { fullName: body.fullName || null, birthday: body.birthday || null, role: body.role || null };
  await query("INSERT INTO users(id,email,password_hash,password_salt,data_json) VALUES($1,$2,$3,$4,$5)", [id, email, hash, salt, data]);
  await createSession(id);
  return NextResponse.json({ success: true, user: { id, email, ...data } });
}
