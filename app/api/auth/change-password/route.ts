import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSessionUser, hashPassword, verifyPassword } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";

const schema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) });

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("The current passcode and a new passcode of at least 10 characters are required.", 400);
    const changed = await withTransaction(async (client) => {
      const result = await client.query<{ password_salt: string; password_hash: string }>("SELECT password_salt,password_hash FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      const row = result.rows[0];
      if (!row || !(await verifyPassword(parsed.data.currentPassword, row.password_salt, row.password_hash))) return false;
      const next = await hashPassword(parsed.data.newPassword);
      await client.query("UPDATE users SET password_salt=$1,password_hash=$2,updated_at=now() WHERE id=$3", [next.salt, next.hash, user.id]);
      await client.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
      return true;
    });
    if (!changed) return jsonError("The current passcode is incorrect.", 400);
    return NextResponse.json({ success: true, signInAgain: true });
  } catch (error) { return serverError(error, "password change failed"); }
}
