import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";
import { healthSchema } from "@/lib/server/validation";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const result = await query<{ data_json: Record<string, unknown>; visibility: string }>(
      `SELECT data_json,visibility FROM health_records
       WHERE user_id=$1 OR (family_id=$2 AND visibility='family')
       ORDER BY created_at DESC`,
      [user.id, user.family_id]
    );
    return NextResponse.json({ records: result.rows.map((row) => ({ ...row.data_json, visibility: row.visibility })) }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return serverError(error, "health list failed"); }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = healthSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid health record.", 400);
    const { visibility = "private", ...record } = parsed.data;
    await query(
      "INSERT INTO health_records(id,user_id,family_id,visibility,data_json) VALUES($1,$2,$3,$4,$5)",
      [record.id, user.id, user.family_id, visibility, record]
    );
    return NextResponse.json({ record: { ...record, visibility } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") return jsonError("That health record already exists.", 409);
    return serverError(error, "health create failed");
  }
}
