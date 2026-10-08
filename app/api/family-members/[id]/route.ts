import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { dependentSchema } from "@/lib/server/validation";
import { jsonError, serverError } from "@/lib/server/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const result = await query("SELECT id,name,role,birthday::text,type,data_json FROM family_members WHERE id=$1 AND family_id=$2", [id, user.family_id]);
    if (!result.rows[0]) return jsonError("Family member not found.", 404);
    return NextResponse.json({ member: result.rows[0] });
  } catch (error) { return serverError(error, "family member read failed"); }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const parsed = dependentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid family member.", 400);
    const { name, role, birthday, type, ...data } = parsed.data;
    const result = await query(
      "UPDATE family_members SET name=$1,role=$2,birthday=$3,type=$4,data_json=$5,updated_at=now() WHERE id=$6 AND family_id=$7",
      [name, role || null, birthday || null, type || null, data, id, user.family_id]
    );
    if (!result.rowCount) return jsonError("Family member not found.", 404);
    return NextResponse.json({ member: { id, name, role, birthday: birthday || "", type, ...data } });
  } catch (error) { return serverError(error, "family member update failed"); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const result = await query("DELETE FROM family_members WHERE id=$1 AND family_id=$2", [id, user.family_id]);
    if (!result.rowCount) return jsonError("Family member not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return serverError(error, "family member delete failed"); }
}
