import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUserId } from "@/lib/server/auth";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const res = await query<{ data_json: any }>("SELECT data_json FROM events WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  return NextResponse.json({ events: res.rows.map((r) => r.data_json) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const event = await req.json();
  await query("INSERT INTO events(id,user_id,data_json) VALUES($1,$2,$3)", [event.id, userId, event]);
  return NextResponse.json({ event });
}
