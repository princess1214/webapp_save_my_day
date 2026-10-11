import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";
import { journalSchema } from "@/lib/server/validation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const result = await query<{ data_json: Record<string, unknown>; visibility: string }>(
      "SELECT data_json,visibility FROM journal_posts WHERE id=$1 AND (user_id=$2 OR (family_id=$3 AND visibility='family'))",
      [id, user.id, user.family_id]
    );
    const row = result.rows[0];
    if (!row) return jsonError("Journal entry not found.", 404);
    return NextResponse.json({ post: { ...row.data_json, visibility: row.visibility } });
  } catch (error) { return serverError(error, "journal read failed"); }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const parsed = journalSchema.safeParse({ ...(await req.json().catch(() => null)), id });
    if (!parsed.success) return jsonError("Invalid journal entry.", 400);
    const { visibility = "private", ...post } = parsed.data;
    const result = await query(
      "UPDATE journal_posts SET data_json=$1,visibility=$2,updated_at=now() WHERE id=$3 AND user_id=$4",
      [post, visibility, id, user.id]
    );
    if (!result.rowCount) return jsonError("Journal entry not found or you do not have permission to update it.", 404);
    return NextResponse.json({ post: { ...post, visibility } });
  } catch (error) { return serverError(error, "journal update failed"); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const result = await query("DELETE FROM journal_posts WHERE id=$1 AND user_id=$2", [id, user.id]);
    if (!result.rowCount) return jsonError("Journal entry not found or you do not have permission to delete it.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return serverError(error, "journal delete failed"); }
}
