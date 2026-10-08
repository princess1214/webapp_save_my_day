import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { createSession, insertLoginHistory, verifyPassword } from "@/lib/server/auth";
import { checkRateLimit, jsonError, serverError } from "@/lib/server/api";

const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });

export async function POST(req: Request) {
  try {
    await ensureSchema();
    if (!(await checkRateLimit(req, "login", 10, 15))) return jsonError("Too many login attempts. Please try again later.", 429);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid email or passcode.", 401);
    const email = parsed.data.email.toLowerCase();
    const result = await query<{
      id: string; password_salt: string; password_hash: string; data_json: Record<string, unknown>;
      family_id: string; account_id: string;
    }>("SELECT id,password_salt,password_hash,data_json,family_id,account_id FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    const valid = user ? await verifyPassword(parsed.data.password, user.password_salt, user.password_hash) : false;
    await insertLoginHistory(user?.id || null, valid);
    if (!user || !valid) return jsonError("Invalid email or passcode.", 401);
    await createSession(user.id);
    return NextResponse.json({ success: true, user: { email, familyId: user.family_id, accountId: user.account_id, ...(user.data_json || {}) } });
  } catch (error) {
    return serverError(error, "login failed");
  }
}
