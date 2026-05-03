import { NextResponse } from "next/server";
import { createSession, hashPassword, insertLoginHistory } from "@/lib/server/auth";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

export async function POST(req: Request) {
  await ensureSchema();
  const body = await req.json();
  const email = String(body.email || "").toLowerCase();
  const password = String(body.password || "");
  const u = await query<{ id: string; password_salt: string; password_hash: string; data_json: any; family_id: string; account_id: string }>("SELECT id,password_salt,password_hash,data_json,family_id,account_id FROM users WHERE email=$1", [email]);
  const row = u.rows[0]; if (!row) return NextResponse.json({ message: "Invalid email or passcode" }, { status: 401 });
  if ((await hashPassword(password, row.password_salt)).hash !== row.password_hash) return NextResponse.json({ message: "Invalid email or passcode" }, { status: 401 });
  await createSession(row.id); await insertLoginHistory(row.id);
  return NextResponse.json({ success: true, user: { email, familyId: row.family_id, accountId: row.account_id, ...(row.data_json || {}) } });
}
