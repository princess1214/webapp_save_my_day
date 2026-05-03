import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const event = await req.json();
  await query("UPDATE events SET data_json=$1, updated_at=now() WHERE id=$2 AND family_id=$3", [event, id, user.family_id]);
  return NextResponse.json({ event });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await query("DELETE FROM events WHERE id=$1 AND family_id=$2", [id, user.family_id]);
  return new NextResponse(null, { status: 204 });
}
