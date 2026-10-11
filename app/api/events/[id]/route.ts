import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";
import { eventSchema } from "@/lib/server/validation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const result = await query<{ data_json: Record<string, unknown>; visibility: string; account_id: string; creator_name: string }>(
      `SELECT e.data_json,e.visibility,u.account_id,
        COALESCE(NULLIF(u.data_json->>'displayName',''),NULLIF(u.data_json->>'fullName',''),'Family member') creator_name
       FROM events e JOIN users u ON u.id=e.user_id
       WHERE e.id=$1 AND (e.user_id=$2 OR (e.family_id=$3 AND e.visibility='family'))`,
      [id, user.id, user.family_id]
    );
    const row = result.rows[0];
    if (!row) return jsonError("Event not found.", 404);
    return NextResponse.json({ event: { ...row.data_json, visibility: row.visibility, createdByAccountId: row.account_id, createdByName: row.creator_name } });
  } catch (error) {
    return serverError(error, "event read failed");
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const parsed = eventSchema.safeParse({ ...(await req.json().catch(() => null)), id });
    if (!parsed.success) return jsonError("Invalid event data.", 400);
    const { visibility, ...event } = parsed.data;
    const result = await query<{ account_id: string; creator_name: string }>(
      `UPDATE events e SET data_json=$1,visibility=$2,updated_at=now()
       FROM users creator
       WHERE e.id=$3 AND creator.id=e.user_id AND e.family_id=$4 AND
         (e.user_id=$5 OR EXISTS(
           SELECT 1 FROM family_memberships m WHERE m.user_id=$5 AND m.family_id=e.family_id AND m.role IN ('owner','admin')
         ))
       RETURNING creator.account_id,
         COALESCE(NULLIF(creator.data_json->>'displayName',''),NULLIF(creator.data_json->>'fullName',''),'Family member') creator_name`,
      [event, visibility, id, user.family_id, user.id]
    );
    const row = result.rows[0];
    if (!row) return jsonError("Event not found or you do not have permission to update it.", 404);
    return NextResponse.json({ event: { ...event, visibility, createdByAccountId: row.account_id, createdByName: row.creator_name } });
  } catch (error) {
    return serverError(error, "event update failed");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const result = await query(
      `DELETE FROM events e WHERE e.id=$1 AND e.family_id=$2 AND
       (e.user_id=$3 OR EXISTS(SELECT 1 FROM family_memberships m WHERE m.user_id=$3 AND m.family_id=e.family_id AND m.role IN ('owner','admin')))`,
      [id, user.family_id, user.id]
    );
    if (!result.rowCount) return jsonError("Event not found or you do not have permission to delete it.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error, "event delete failed");
  }
}
