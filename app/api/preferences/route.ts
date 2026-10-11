import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { jsonError, sanitizedJson, serverError } from "@/lib/server/api";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const result = await query<{ data_json: Record<string, unknown> }>("SELECT data_json FROM preferences WHERE user_id=$1", [user.id]);
    return NextResponse.json({ preferences: result.rows[0]?.data_json || {} }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return serverError(error, "preferences read failed"); }
}

export async function PUT(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const data = sanitizedJson(await req.json().catch(() => ({})));
    await query(
      `INSERT INTO preferences(user_id,data_json,updated_at) VALUES($1,$2,now())
       ON CONFLICT (user_id) DO UPDATE SET data_json=preferences.data_json || EXCLUDED.data_json,updated_at=now()`,
      [user.id, data]
    );
    const result = await query<{ data_json: Record<string, unknown> }>("SELECT data_json FROM preferences WHERE user_id=$1", [user.id]);
    return NextResponse.json({ preferences: result.rows[0]?.data_json || {} });
  } catch (error) { return serverError(error, "preferences update failed"); }
}
