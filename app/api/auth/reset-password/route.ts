import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { digestToken, hashPassword } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";

const schema = z.object({ token: z.string().min(20).max(512), password: z.string().min(10).max(128) });

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid reset link or passcode.", 400);
    const tokenHash = digestToken(parsed.data.token);
    const { salt, hash } = await hashPassword(parsed.data.password);
    const changed = await withTransaction(async (client) => {
      const result = await client.query<{ user_id: string }>(
        `SELECT user_id FROM password_reset_tokens
         WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE`,
        [tokenHash]
      );
      const row = result.rows[0];
      if (!row) return false;
      await client.query("UPDATE users SET password_hash=$1,password_salt=$2,updated_at=now() WHERE id=$3", [hash, salt, row.user_id]);
      await client.query("UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1", [tokenHash]);
      await client.query("DELETE FROM sessions WHERE user_id=$1", [row.user_id]);
      return true;
    });
    if (!changed) return jsonError("This reset link is invalid or has expired.", 400);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, "password reset failed");
  }
}
