import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const res = await query<{ data_json: any }>("SELECT data_json FROM events WHERE family_id=$1 ORDER BY created_at DESC", [user.family_id]);
  return NextResponse.json({ events: res.rows.map((r: { data_json: any }) => r.data_json) });
}

export async function POST(req: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const event = await req.json();
  await query("INSERT INTO events(id,user_id,family_id,data_json) VALUES($1,$2,$3,$4)", [event.id, user.id, user.family_id, event]);
  return NextResponse.json({ event });
}
