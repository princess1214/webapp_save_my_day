import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { dependentSchema, eventSchema, healthSchema, journalSchema } from "@/lib/server/validation";
import { jsonError, serverError } from "@/lib/server/api";

const importSchema = z.object({
  profile: z.record(z.string(), z.unknown()).optional(),
  appPreferences: z.record(z.string(), z.unknown()).optional(),
  familyMembers: z.array(dependentSchema.extend({ id: z.string().optional() })).max(100).default([]),
  events: z.array(eventSchema).max(1000).default([]),
  journalPosts: z.array(journalSchema).max(1000).default([]),
  healthRecords: z.array(healthSchema).max(1000).default([]),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = importSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("The local backup is invalid or too large.", 400);
    const data = parsed.data;
    const counts = await withTransaction(async (client) => {
      const imported = { familyMembers: 0, events: 0, journalPosts: 0, healthRecords: 0 };
      if (data.profile) {
        const safeProfile = { ...data.profile };
        delete safeProfile.email; delete safeProfile.accountId; delete safeProfile.familyId; delete safeProfile.passcode;
        await client.query("UPDATE users SET data_json=$1::jsonb || data_json,updated_at=now() WHERE id=$2", [safeProfile, user.id]);
      }
      if (data.appPreferences) {
        await client.query(
          `INSERT INTO preferences(user_id,data_json) VALUES($1,$2)
           ON CONFLICT(user_id) DO UPDATE SET data_json=EXCLUDED.data_json || preferences.data_json,updated_at=now()`,
          [user.id, data.appPreferences]
        );
      }
      for (const member of data.familyMembers) {
        const { id, name, role, birthday, type, ...extra } = member;
        const result = await client.query(
          `INSERT INTO family_members(id,user_id,family_id,name,role,birthday,type,data_json)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING`,
          [id || crypto.randomUUID(), user.id, user.family_id, name, role || null, birthday || null, type || null, extra]
        );
        imported.familyMembers += result.rowCount || 0;
      }
      for (const item of data.events) {
        const { visibility = "family", ...event } = item;
        if (event.id.startsWith("us-fed-")) continue;
        const result = await client.query(
          `INSERT INTO events(id,user_id,family_id,visibility,data_json) VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(id) DO NOTHING`,
          [event.id, user.id, user.family_id, visibility, event]
        );
        imported.events += result.rowCount || 0;
      }
      for (const item of data.journalPosts) {
        const { visibility = "private", ...post } = item;
        const result = await client.query(
          `INSERT INTO journal_posts(id,user_id,family_id,visibility,data_json) VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(id) DO NOTHING`,
          [post.id, user.id, user.family_id, visibility, post]
        );
        imported.journalPosts += result.rowCount || 0;
      }
      for (const item of data.healthRecords) {
        const { visibility = "private", ...record } = item;
        const result = await client.query(
          `INSERT INTO health_records(id,user_id,family_id,visibility,data_json) VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(id) DO NOTHING`,
          [record.id, user.id, user.family_id, visibility, record]
        );
        imported.healthRecords += result.rowCount || 0;
      }
      return imported;
    });
    return NextResponse.json({ success: true, imported: counts, message: "Cloud records were preserved; only missing local records were added." });
  } catch (error) { return serverError(error, "local data import failed"); }
}
