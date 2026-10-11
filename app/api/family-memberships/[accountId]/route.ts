import { NextResponse } from "next/server";
import { z } from "zod";
import { query, withTransaction } from "@/lib/db";
import { makeFamilyId, requireSessionUser } from "@/lib/server/auth";
import { isFamilyManager, jsonError, serverError } from "@/lib/server/api";

export async function PATCH(req: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (user.family_role !== "owner") return jsonError("Only the family owner can change account roles.", 403);
    const { accountId } = await params;
    if (accountId === user.account_id) return jsonError("The family owner cannot change their own role.", 400);
    const parsed = z.object({ role: z.enum(["admin", "member"]) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid role.", 400);
    const result = await query(
      `UPDATE family_memberships m SET role=$1 FROM users u
       WHERE m.user_id=u.id AND u.account_id=$2 AND m.family_id=$3`,
      [parsed.data.role, accountId, user.family_id]
    );
    if (!result.rowCount) return jsonError("Family account not found.", 404);
    return NextResponse.json({ success: true });
  } catch (error) { return serverError(error, "membership update failed"); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!isFamilyManager(user.family_role)) return jsonError("Only family managers can remove accounts.", 403);
    const { accountId } = await params;
    if (accountId === user.account_id) return jsonError("Use account settings to leave your family.", 400);
    const removed = await withTransaction(async (client) => {
      const target = await client.query<{ id: string }>(
        `SELECT u.id FROM users u JOIN family_memberships m ON m.user_id=u.id
         WHERE u.account_id=$1 AND m.family_id=$2 AND m.role<>'owner' FOR UPDATE`,
        [accountId, user.family_id]
      );
      const row = target.rows[0];
      if (!row) return false;
      const familyId = makeFamilyId();
      await client.query("INSERT INTO families(id,name,created_by) VALUES($1,'My Family',$2)", [familyId, row.id]);
      await client.query("UPDATE family_memberships SET family_id=$1,role='owner',joined_at=now() WHERE user_id=$2", [familyId, row.id]);
      await client.query("UPDATE users SET family_id=$1,updated_at=now() WHERE id=$2", [familyId, row.id]);
      return true;
    });
    if (!removed) return jsonError("Family account not found or cannot be removed.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return serverError(error, "membership removal failed"); }
}
