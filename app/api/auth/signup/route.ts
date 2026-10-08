import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import {
  createSession,
  digestToken,
  hashPassword,
  insertLoginHistory,
  makeAccountId,
  makeFamilyId,
} from "@/lib/server/auth";
import { checkRateLimit, jsonError, serverError } from "@/lib/server/api";

const signupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  fullName: z.string().trim().max(120).optional(),
  displayName: z.string().trim().max(80).optional(),
  birthday: z.string().max(10).optional(),
  role: z.string().trim().max(40).optional(),
  inviteToken: z.string().min(20).max(512).optional(),
});

export async function POST(req: Request) {
  try {
    await ensureSchema();
    if (!(await checkRateLimit(req, "signup", 8, 60))) {
      return jsonError("Too many signup attempts. Please try again later.", 429);
    }
    const parsed = signupSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("Please provide a valid email and a passcode of at least 10 characters.", 400);
    const payload = parsed.data;
    const email = payload.email.toLowerCase();
    const { salt, hash } = await hashPassword(payload.password);
    const userId = crypto.randomUUID();
    const accountId = makeAccountId();
    const profile = {
      firstName: payload.fullName?.split(/\s+/)[0] || "",
      lastName: payload.fullName?.split(/\s+/).slice(1).join(" ") || "",
      fullName: payload.fullName || "",
      displayName: payload.displayName || payload.fullName || "",
      birthday: payload.birthday || "",
      role: payload.role || "Adult",
      phone: "",
    };

    const familyId = await withTransaction(async (client) => {
      if ((await client.query("SELECT 1 FROM users WHERE email=$1", [email])).rowCount) {
        throw Object.assign(new Error("EMAIL_EXISTS"), { code: "EMAIL_EXISTS" });
      }
      let nextFamilyId = makeFamilyId();
      let membershipRole: "owner" | "admin" | "member" = "owner";
      let invitationId: string | null = null;
      if (payload.inviteToken) {
        const invite = await client.query<{
          id: string; family_id: string; email: string; role: "admin" | "member";
        }>(
          `SELECT id,family_id,email,role FROM family_invitations
           WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()
           FOR UPDATE`,
          [digestToken(payload.inviteToken)]
        );
        const row = invite.rows[0];
        if (!row || row.email.toLowerCase() !== email) {
          throw Object.assign(new Error("INVALID_INVITE"), { code: "INVALID_INVITE" });
        }
        nextFamilyId = row.family_id;
        membershipRole = row.role;
        invitationId = row.id;
      } else {
        await client.query("INSERT INTO families(id,name,created_by) VALUES($1,$2,$3)", [
          nextFamilyId,
          `${profile.displayName || "My"} Family`,
          userId,
        ]);
      }
      await client.query(
        `INSERT INTO users(id,account_id,family_id,email,password_hash,password_salt,data_json)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [userId, accountId, nextFamilyId, email, hash, salt, profile]
      );
      await client.query(
        "INSERT INTO family_memberships(user_id,family_id,role) VALUES($1,$2,$3)",
        [userId, nextFamilyId, membershipRole]
      );
      if (invitationId) {
        await client.query("UPDATE family_invitations SET accepted_at=now() WHERE id=$1", [invitationId]);
      }
      return nextFamilyId;
    });

    await createSession(userId);
    await insertLoginHistory(userId, true);
    return NextResponse.json(
      { success: true, user: { accountId, familyId, email, ...profile } },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === "EMAIL_EXISTS" || error?.code === "23505") return jsonError("An account already exists for that email.", 409);
    if (error?.code === "INVALID_INVITE") return jsonError("That family invitation is invalid, expired, or intended for another email.", 400);
    return serverError(error, "signup failed");
  }
}
