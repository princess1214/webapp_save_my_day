import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/server/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ message: "Not logged in" }, { status: 401 });
  const r = await query<{ data_json: any }>("SELECT data_json FROM users WHERE id=$1", [user.id]);
  return NextResponse.json({ authenticated: true, user: { id:user.id,email:user.email,familyId:user.family_id,accountId:user.account_id,...(r.rows[0]?.data_json||{}) } });
}
