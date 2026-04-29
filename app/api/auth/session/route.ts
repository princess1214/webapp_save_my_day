import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { query } from "@/lib/db";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ message: "Not logged in" }, { status: 401 });
  const result = await query<{ email: string; data_json: any }>("SELECT email,data_json FROM users WHERE id=$1", [userId]);
  const row = result.rows[0];
  return NextResponse.json({ authenticated: true, user: { email: row.email, ...(row.data_json || {}) } });
}
