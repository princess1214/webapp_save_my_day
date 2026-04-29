import crypto from "crypto";
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/schema";
import { createSession, hashPassword, insertLoginHistory } from "@/lib/server/auth";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json();
  const email = String(body.email || "").toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return NextResponse.json({ message: "email and password required" }, { status: 400 });
  if ((await query("SELECT 1 FROM users WHERE email=$1", [email])).rowCount) return NextResponse.json({ message: "already exists" }, { status: 409 });
  const { salt, hash } = await hashPassword(password);
  const id = crypto.randomUUID();
  const accountId = Math.floor(Math.random()*1e13).toString().padStart(13,"0");
  const familyId = body.familyId || Math.random().toString(36).slice(2, 8);
  const data = { fullName: body.fullName || null, birthday: body.birthday || null, role: body.role || null };
  await query("INSERT INTO users(id,account_id,family_id,email,password_hash,password_salt,data_json) VALUES($1,$2,$3,$4,$5,$6,$7)", [id, accountId, familyId, email, hash, salt, data]);
  await createSession(id);
  await insertLoginHistory(id);
  return NextResponse.json({ success: true, user: { id, accountId, familyId, email, ...data } });
}
