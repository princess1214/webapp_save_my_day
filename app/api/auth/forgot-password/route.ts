import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let email = "";

  try {
    const body = (await request.json()) as { email?: string };
    email = (body?.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 }
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { message: "A valid email is required." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "If the email exists, a reset link has been sent.",
  });
}
