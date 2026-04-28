import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "Unknown device";
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "";

  let location = "Unknown location";

  if (ip) {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`, {
        next: { revalidate: 60 * 30 },
      });
      if (response.ok) {
        const info = (await response.json()) as any;
        const parts = [info?.city, info?.region, info?.country_name].filter(Boolean);
        if (parts.length > 0) {
          location = parts.join(", ");
        }
      }
    } catch {
      // Ignore location failures for local/offline dev.
    }
  }

  return NextResponse.json({ userAgent, ip: ip || null, location });
}
