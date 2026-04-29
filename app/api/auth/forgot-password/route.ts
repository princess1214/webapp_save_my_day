import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/server-db";
import { hashToken } from "@/lib/server-auth";

async function sendResetEmail(email: string, link: string) {
  if (!process.env.EMAIL_PROVIDER_API_KEY || !process.env.EMAIL_FROM) return;
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.EMAIL_PROVIDER_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: email, subject: "Reset your password", html: `<p>Reset your password <a href='${link}'>here</a>.</p>` }) });
}

export async function POST(request: NextRequest) {
  await initDb();
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  if (email && email.includes("@")) {
    const user = await db.execute({ sql: "SELECT account_id FROM users WHERE email=? LIMIT 1", args: [email] });
    const row: any = user.rows[0];
    if (row) {
      const token = crypto.randomBytes(32).toString("hex");
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600_000).toISOString();
      await db.execute({ sql: "INSERT INTO password_reset_tokens (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)", args: [hashToken(token), row.account_id, expiresAt, now.toISOString()] });
      const link = `${process.env.APP_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
      try { await sendResetEmail(email, link); } catch (e) { console.error("Reset email failed", e); }
    }
  }
  return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent." });
}
