import crypto from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export function serverError(error: unknown, context: string) {
  const requestId = crypto.randomUUID();
  console.error(`[${requestId}] ${context}`, error instanceof Error ? error.message : error);
  return NextResponse.json(
    { message: "Something went wrong. Please try again.", requestId },
    { status: 500 }
  );
}

export function requestIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function checkRateLimit(req: Request, action: string, limit: number, minutes = 15) {
  const keyHash = crypto
    .createHash("sha256")
    .update(`${action}:${requestIp(req)}`)
    .digest("hex");
  const result = await query<{ attempts: number }>(
    `INSERT INTO auth_rate_limits(key_hash,attempts,window_started_at,updated_at)
     VALUES($1,1,now(),now())
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts=CASE WHEN auth_rate_limits.window_started_at < now()-($2::text || ' minutes')::interval THEN 1 ELSE auth_rate_limits.attempts+1 END,
       window_started_at=CASE WHEN auth_rate_limits.window_started_at < now()-($2::text || ' minutes')::interval THEN now() ELSE auth_rate_limits.window_started_at END,
       updated_at=now()
     RETURNING attempts`,
    [keyHash, minutes]
  );
  return (result.rows[0]?.attempts || 1) <= limit;
}

export function isFamilyManager(role: string) {
  return role === "owner" || role === "admin";
}

export function sanitizedJson(value: unknown) {
  const json = JSON.stringify(value);
  if (json.length > 1_000_000) throw new Error("Payload too large");
  return JSON.parse(json);
}
