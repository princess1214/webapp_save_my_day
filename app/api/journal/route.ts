import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";
import { jsonError, serverError } from "@/lib/server/api";
import { journalSchema } from "@/lib/server/validation";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const result = await query<{ data_json: Record<string, unknown>; visibility: string }>(
      `SELECT data_json,visibility FROM journal_posts
       WHERE user_id=$1 OR (family_id=$2 AND visibility='family')
       ORDER BY created_at DESC`,
      [user.id, user.family_id]
    );
    return NextResponse.json({ posts: result.rows.map((row) => ({ ...row.data_json, visibility: row.visibility })) }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return serverError(error, "journal list failed");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    const parsed = journalSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Invalid journal entry.", 400);
    const { visibility = "private", ...post } = parsed.data;
    await query(
      "INSERT INTO journal_posts(id,user_id,family_id,visibility,data_json) VALUES($1,$2,$3,$4,$5)",
      [post.id, user.id, user.family_id, visibility, post]
    );
    return NextResponse.json({ post: { ...post, visibility } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") return jsonError("That journal entry already exists.", 409);
    return serverError(error, "journal create failed");
  }
}
