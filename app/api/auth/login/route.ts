import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, initDb } from "@/lib/server-db";
import { createSession, verifyPassword } from "@/lib/server-auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  await initDb();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const user = await db.execute({ sql: "SELECT * FROM users WHERE email=? LIMIT 1", args: [email] });
  const row: any = user.rows[0];
  if (!row || !verifyPassword(parsed.data.password, String(row.password_hash))) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  await createSession(String(row.account_id));
  return NextResponse.json({ success: true, user: { accountId: row.account_id, familyId: row.family_id, email: row.email, fullName: row.full_name, birthday: row.birthday, role: row.role } });
}
