import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { isFamilyManager, jsonError, serverError } from "@/lib/server/api";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const family = await query<{ id: string; name: string; created_at: string }>("SELECT id,name,created_at FROM families WHERE id=$1", [user.family_id]);
    const members = await query<{ account_id: string; email: string; role: string; data_json: Record<string, unknown> }>(
      `SELECT u.account_id,u.email,m.role,u.data_json FROM family_memberships m
       JOIN users u ON u.id=m.user_id WHERE m.family_id=$1 ORDER BY m.joined_at`,
      [user.family_id]
    );
    return NextResponse.json({ family: family.rows[0], members: members.rows.map((row) => ({ accountId: row.account_id, email: row.email, familyRole: row.role, displayName: row.data_json?.displayName || row.data_json?.fullName || "Family member" })) }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return serverError(error, "family read failed"); }
}

export async function PUT(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!isFamilyManager(user.family_role)) return jsonError("Only family managers can update the family.", 403);
    const parsed = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("A family name is required.", 400);
    await query("UPDATE families SET name=$1 WHERE id=$2", [parsed.data.name, user.family_id]);
    return NextResponse.json({ family: { id: user.family_id, name: parsed.data.name } });
  } catch (error) { return serverError(error, "family update failed"); }
}
