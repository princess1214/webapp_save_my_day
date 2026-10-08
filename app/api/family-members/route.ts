import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { dependentSchema } from "@/lib/server/validation";
import { jsonError, serverError } from "@/lib/server/api";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const result = await query<{
      id: string; name: string; role: string; birthday: string | null; type: string | null; data_json: Record<string, unknown>;
    }>("SELECT id,name,role,birthday::text,type,data_json FROM family_members WHERE family_id=$1 ORDER BY created_at", [user.family_id]);
    return NextResponse.json({ members: result.rows.map((row) => ({ id: row.id, name: row.name, role: row.role || "", birthday: row.birthday || "", type: row.type, ...row.data_json })) }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return serverError(error, "family member list failed"); }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = dependentSchema.extend({ id: z.string().min(1).max(160).optional() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid family member.", 400);
    const { id: requestedId, name, role, birthday, type, ...data } = parsed.data;
    const id = requestedId || crypto.randomUUID();
    await query(
      "INSERT INTO family_members(id,user_id,family_id,name,role,birthday,type,data_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, user.id, user.family_id, name, role || null, birthday || null, type || null, data]
    );
    return NextResponse.json({ member: { id, name, role, birthday: birthday || "", type, ...data } }, { status: 201 });
  } catch (error) { return serverError(error, "family member create failed"); }
}
