import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { isFamilyManager, jsonError, serverError } from "@/lib/server/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!isFamilyManager(user.family_role)) return jsonError("Forbidden", 403);
    const { id } = await params;
    const result = await query("UPDATE family_invitations SET revoked_at=now() WHERE id=$1 AND family_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL", [id, user.family_id]);
    if (!result.rowCount) return jsonError("Invitation not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return serverError(error, "invitation revoke failed"); }
}
