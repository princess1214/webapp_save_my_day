import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const [profile, dependents, events, journal, health, preferences] = await Promise.all([
      query<{ data_json: Record<string, unknown> }>("SELECT data_json FROM users WHERE id=$1", [user.id]),
      query<{ id: string; name: string; role: string; birthday: string | null; type: string | null; data_json: Record<string, unknown> }>("SELECT id,name,role,birthday::text,type,data_json FROM family_members WHERE family_id=$1 ORDER BY created_at", [user.family_id]),
      query<{ data_json: Record<string, unknown>; visibility: string; account_id: string; creator_name: string }>(
        `SELECT e.data_json,e.visibility,u.account_id,
          COALESCE(NULLIF(u.data_json->>'displayName',''),NULLIF(u.data_json->>'fullName',''),'Family member') creator_name
         FROM events e JOIN users u ON u.id=e.user_id
         WHERE e.user_id=$1 OR (e.family_id=$2 AND e.visibility='family') ORDER BY e.created_at DESC`,
        [user.id, user.family_id]
      ),
      query<{ data_json: Record<string, unknown>; visibility: string }>("SELECT data_json,visibility FROM journal_posts WHERE user_id=$1 OR (family_id=$2 AND visibility='family') ORDER BY created_at DESC", [user.id, user.family_id]),
      query<{ data_json: Record<string, unknown>; visibility: string }>("SELECT data_json,visibility FROM health_records WHERE user_id=$1 OR (family_id=$2 AND visibility='family') ORDER BY created_at DESC", [user.id, user.family_id]),
      query<{ data_json: Record<string, unknown> }>("SELECT data_json FROM preferences WHERE user_id=$1", [user.id]),
    ]);
    return NextResponse.json({
      profile: { email: user.email, accountId: user.account_id, familyId: user.family_id, ...(profile.rows[0]?.data_json || {}) },
      familyMembers: dependents.rows.map((row) => ({ id: row.id, name: row.name, role: row.role || "", birthday: row.birthday || "", type: row.type, ...row.data_json })),
      events: events.rows.map((row) => ({ ...row.data_json, visibility: row.visibility, createdByAccountId: row.account_id, createdByName: row.creator_name })),
      journalPosts: journal.rows.map((row) => ({ ...row.data_json, visibility: row.visibility })),
      healthRecords: health.rows.map((row) => ({ ...row.data_json, visibility: row.visibility })),
      appPreferences: preferences.rows[0]?.data_json || {},
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return serverError(error, "data sync failed"); }
}
