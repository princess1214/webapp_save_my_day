import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { digestToken } from "@/lib/server/auth";
import { checkRateLimit, jsonError, serverError } from "@/lib/server/api";
import { appBaseUrl, isEmailConfigured, sendEmail } from "@/lib/server/email";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(req: Request) {
  try {
    await ensureSchema();
    if (!isEmailConfigured()) return jsonError("Password reset email is not configured. Contact the family administrator.", 503);
    if (!(await checkRateLimit(req, "forgot-password", 5, 30))) return jsonError("Too many reset requests. Please try again later.", 429);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("A valid email is required.", 400);
    const email = parsed.data.email.toLowerCase();
    const result = await query<{ id: string }>("SELECT id FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("base64url");
      const tokenHash = digestToken(rawToken);
      const expires = new Date(Date.now() + 30 * 60 * 1000);
      await query(
        "INSERT INTO password_reset_tokens(token,token_hash,user_id,expires_at) VALUES($1,$2,$3,$4)",
        [tokenHash, tokenHash, user.id, expires]
      );
      const resetUrl = `${appBaseUrl(req)}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        await sendEmail({
          to: email,
          subject: "Reset your AssistMyDay passcode",
          html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your passcode</a></p><p>This link expires in 30 minutes.</p>`,
        });
      } catch (error) {
        await query("DELETE FROM password_reset_tokens WHERE token_hash=$1", [tokenHash]);
        throw error;
      }
    }
    return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    const response = serverError(error, "password reset email failed");
    return NextResponse.json({ message: "The reset email could not be sent. Please try again later." }, { status: response.status === 500 ? 502 : response.status });
  }
}
