import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let payload: { token?: string; password?: string } = {};

  try {
    payload = (await request.json()) as { token?: string; password?: string };
  } catch {
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 }
    );
  }

  const token = (payload.token || "").trim();
  const password = payload.password || "";

  if (!token) {
    return NextResponse.json(
      { message: "Reset token is required." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Password reset accepted.",
  });
}
