import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, initDb } from "@/lib/server-db";
import { createSession, hashPassword, makeAccountId, makeFamilyId } from "@/lib/server-auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(8), fullName: z.string().optional(), displayName: z.string().optional(), birthday: z.string().optional(), role: z.string().optional(), inviteFamilyId: z.string().optional() });

async function sendWelcomeEmail(email: string, name?: string) {
  if (!process.env.EMAIL_PROVIDER_API_KEY || !process.env.EMAIL_FROM) return;
  try {
    await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.EMAIL_PROVIDER_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: email, subject: "Welcome to AssistMyDay", html: `<p>Hi ${name || "there"}, welcome to AssistMyDay.</p>` }) });
  } catch (error) { console.error("Welcome email failed", error); }
}

export async function POST(req: NextRequest) {
  await initDb();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  const p = parsed.data;
  const email = p.email.toLowerCase();
  const existing = await db.execute({ sql: "SELECT 1 FROM users WHERE email=?", args: [email] });
  if (existing.rows.length) return NextResponse.json({ message: "Email already exists" }, { status: 409 });
  const accountId = makeAccountId();
  const familyId = p.inviteFamilyId || makeFamilyId();
  const now = new Date().toISOString();
  const password = hashPassword(p.password);
  await db.execute({ sql: "INSERT INTO users (account_id,family_id,email,password_salt,password_hash,full_name,display_name,birthday,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", args: [accountId, familyId, email, password.salt, password.hash, p.fullName || null, p.displayName || p.fullName || null, p.birthday || null, p.role || "parent", now, now] });
  await createSession(accountId);
  void sendWelcomeEmail(email, p.displayName || p.fullName);
  return NextResponse.json({ success: true, user: { accountId, familyId, email } });
}
