import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";
import { eventSchema } from "@/lib/server/validation";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const result = await query<{ data_json: Record<string, unknown>; visibility: "family" | "private"; account_id: string; creator_name: string }>(
      `SELECT e.data_json,e.visibility,u.account_id,
        COALESCE(NULLIF(u.data_json->>'displayName',''),NULLIF(u.data_json->>'fullName',''),'Family member') AS creator_name
       FROM events e JOIN users u ON u.id=e.user_id
       WHERE (e.user_id=$1) OR (e.family_id=$2 AND e.visibility='family')
       ORDER BY e.created_at DESC`,
      [user.id, user.family_id]
    );
    const events = result.rows.map((row) => ({
      ...row.data_json,
      visibility: row.visibility,
      createdByAccountId: row.account_id,
      createdByName: row.creator_name,
    }));
    return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return serverError(error, "event list failed");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = eventSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid event data.", 400);
    const { visibility, ...event } = parsed.data;
    const result = await query<{ display_name: string }>(
      `INSERT INTO events(id,user_id,family_id,visibility,data_json)
       VALUES($1,$2,$3,$4,$5)
       RETURNING COALESCE((SELECT NULLIF(data_json->>'displayName','') FROM users WHERE id=$2),'Family member') AS display_name`,
      [event.id, user.id, user.family_id, visibility, event]
    );
    return NextResponse.json({ event: { ...event, visibility, createdByName: result.rows[0]?.display_name || "Family member", createdByAccountId: user.account_id } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") return jsonError("An event with that ID already exists.", 409);
    return serverError(error, "event create failed");
  }
}
