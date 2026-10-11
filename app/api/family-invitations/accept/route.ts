import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSessionUser, digestToken } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = z.object({ token: z.string().min(20).max(512) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid invitation.", 400);
    const joinedFamilyId = await withTransaction(async (client) => {
      const invite = await client.query<{ id: string; family_id: string; email: string; role: "admin" | "member" }>(
        `SELECT id,family_id,email,role FROM family_invitations
         WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`,
        [digestToken(parsed.data.token)]
      );
      const row = invite.rows[0];
      if (!row || row.email.toLowerCase() !== user.email.toLowerCase()) return null;
      const currentFamily = await client.query<{ member_count: string }>("SELECT count(*)::text member_count FROM family_memberships WHERE family_id=$1", [user.family_id]);
      if (Number(currentFamily.rows[0]?.member_count || 0) > 1) throw Object.assign(new Error("CURRENT_FAMILY_NOT_EMPTY"), { code: "CURRENT_FAMILY_NOT_EMPTY" });
      await client.query("DELETE FROM family_memberships WHERE user_id=$1", [user.id]);
      await client.query("INSERT INTO family_memberships(user_id,family_id,role) VALUES($1,$2,$3)", [user.id, row.family_id, row.role]);
      await client.query("UPDATE users SET family_id=$1,updated_at=now() WHERE id=$2", [row.family_id, user.id]);
      await client.query("UPDATE family_invitations SET accepted_at=now() WHERE id=$1", [row.id]);
      return row.family_id;
    });
    if (!joinedFamilyId) return jsonError("That invitation is invalid, expired, or intended for another account.", 400);
    return NextResponse.json({ success: true, familyId: joinedFamilyId });
  } catch (error: any) {
    if (error?.code === "CURRENT_FAMILY_NOT_EMPTY") return jsonError("You can only join another family when your current family has no other accounts.", 409);
    return serverError(error, "invitation acceptance failed");
  }
}
