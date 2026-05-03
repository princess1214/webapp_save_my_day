import crypto from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { sendPasswordResetEmail } from "@/lib/server/email";

export async function POST(req: Request) {
  await ensureSchema();
  const { email } = await req.json();
  const u = await query<{ id: string }>("SELECT id FROM users WHERE email=$1", [String(email || "").toLowerCase()]);
  if (!u.rows[0]) return NextResponse.json({ success: true });
  const token = crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 30);
  await query("INSERT INTO password_reset_tokens(token,user_id,expires_at) VALUES($1,$2,$3)", [token, u.rows[0].id, expires]);

  const appUrl = process.env.APP_URL || new URL(req.url).origin;
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendPasswordResetEmail({ to: String(email || "").toLowerCase(), resetUrl });
  } catch (error) {
    console.error("Failed to send password reset email", error);
    return NextResponse.json({ message: "Unable to send reset link right now. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
