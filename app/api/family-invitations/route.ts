import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireSessionUser, digestToken } from "@/lib/server/auth";
import { appBaseUrl, isEmailConfigured, sendEmail } from "@/lib/server/email";
import { isFamilyManager, jsonError, serverError } from "@/lib/server/api";

const inviteSchema = z.object({ email: z.string().trim().email().max(254), role: z.enum(["admin", "member"]).default("member") });

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!isFamilyManager(user.family_role)) return jsonError("Forbidden", 403);
    const result = await query(
      `SELECT id,email,role,expires_at,created_at FROM family_invitations
       WHERE family_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()
       ORDER BY created_at DESC`,
      [user.family_id]
    );
    return NextResponse.json({ invitations: result.rows }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) { return serverError(error, "invitation list failed"); }
}

export async function POST(req: Request) {
  let invitationId: string | null = null;
  try {
    const user = await requireSessionUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!isFamilyManager(user.family_role)) return jsonError("Only family managers can invite people.", 403);
    if (!isEmailConfigured()) return jsonError("Invitation email is not configured. Add the email provider settings first.", 503);
    const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return jsonError("A valid email and role are required.", 400);
    const email = parsed.data.email.toLowerCase();
    const existing = await query("SELECT 1 FROM users WHERE email=$1 AND family_id=$2", [email, user.family_id]);
    if (existing.rowCount) return jsonError("That account is already in your family.", 409);
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = digestToken(rawToken);
    invitationId = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query("UPDATE family_invitations SET revoked_at=now() WHERE family_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL", [user.family_id, email]);
    await query(
      `INSERT INTO family_invitations(id,family_id,email,token_hash,role,invited_by,expires_at)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [invitationId, user.family_id, email, tokenHash, parsed.data.role, user.id, expires]
    );
    const family = await query<{ name: string }>("SELECT name FROM families WHERE id=$1", [user.family_id]);
    const inviteUrl = `${appBaseUrl(req)}/welcome?invite=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
    await sendEmail({
      to: email,
      subject: "You are invited to an AssistMyDay family",
      html: `<p>You have been invited to join ${family.rows[0]?.name || "a family"} in AssistMyDay.</p><p><a href="${inviteUrl}">Accept the invitation</a></p><p>This invitation expires in 7 days.</p>`,
    });
    return NextResponse.json({ invitation: { id: invitationId, email, role: parsed.data.role, expiresAt: expires.toISOString() } }, { status: 201 });
  } catch (error) {
    if (invitationId) await query("DELETE FROM family_invitations WHERE id=$1", [invitationId]).catch(() => undefined);
    return serverError(error, "invitation send failed");
  }
}
