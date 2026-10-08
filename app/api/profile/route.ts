import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { withTransaction } from "@/lib/db";
import { clearSession, requireSessionUser } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";

const profileSchema = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  fullName: z.string().max(160).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().max(40).optional(),
  role: z.string().max(80).optional(),
  birthday: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
}).strip();

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const result = await query<{ data_json: Record<string, unknown> }>("SELECT data_json FROM users WHERE id=$1", [user.id]);
    return NextResponse.json({ profile: { email: user.email, accountId: user.account_id, familyId: user.family_id, ...(result.rows[0]?.data_json || {}) } }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return serverError(error, "profile read failed"); }
}

export async function PUT(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = profileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid profile data.", 400);
    const result = await query<{ data_json: Record<string, unknown> }>(
      "UPDATE users SET data_json=data_json || $1::jsonb,updated_at=now() WHERE id=$2 RETURNING data_json",
      [parsed.data, user.id]
    );
    return NextResponse.json({ profile: { email: user.email, accountId: user.account_id, familyId: user.family_id, ...(result.rows[0]?.data_json || {}) } });
  } catch (error) { return serverError(error, "profile update failed"); }
}

export async function DELETE() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const deleted = await withTransaction(async (client) => {
      if (user.family_role === "owner") {
        const members = await client.query<{ count: string }>("SELECT count(*)::text count FROM family_memberships WHERE family_id=$1", [user.family_id]);
        if (Number(members.rows[0]?.count || 0) > 1) return false;
      }
      await client.query("DELETE FROM users WHERE id=$1", [user.id]);
      await client.query("DELETE FROM families WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM users WHERE family_id=$1)", [user.family_id]);
      return true;
    });
    if (!deleted) return jsonError("Transfer family ownership or remove the other adult accounts before deleting this account.", 409);
    await clearSession();
    return new NextResponse(null, { status: 204 });
  } catch (error) { return serverError(error, "account deletion failed"); }
}
