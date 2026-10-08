import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { canAcceptInvitation, canMutateEvent, canMutatePrivateRecord, canReadRecord } from "../lib/server/policy.mjs";

const memberA = { id: "a", familyId: "family-1", familyRole: "member" };
const memberB = { id: "b", familyId: "family-1", familyRole: "member" };
const outsider = { id: "x", familyId: "family-2", familyRole: "owner" };

test("a shared event is readable within its family", () => {
  const event = { ownerId: memberA.id, familyId: memberA.familyId, visibility: "family" };
  assert.equal(canReadRecord(event, memberB), true);
});

test("another family cannot read, update, or delete an event", () => {
  const event = { ownerId: memberA.id, familyId: memberA.familyId, visibility: "family" };
  assert.equal(canReadRecord(event, outsider), false);
  assert.equal(canMutateEvent(event, outsider), false);
});

test("journal and health records are private to their owner by default", () => {
  const privateRecord = { ownerId: memberA.id, familyId: memberA.familyId, visibility: "private" };
  assert.equal(canReadRecord(privateRecord, memberB), false);
  assert.equal(canMutatePrivateRecord(privateRecord, memberB), false);
  assert.equal(canReadRecord(privateRecord, memberA), true);
});

test("an invalid, expired, revoked, or wrong-email invitation cannot grant membership", () => {
  const base = { email: "adult@example.com", expiresAt: "2099-01-01T00:00:00.000Z", acceptedAt: null, revokedAt: null };
  assert.equal(canAcceptInvitation(base, "other@example.com", new Date("2026-01-01")), false);
  assert.equal(canAcceptInvitation({ ...base, expiresAt: "2020-01-01" }, base.email, new Date("2026-01-01")), false);
  assert.equal(canAcceptInvitation({ ...base, revokedAt: "2026-01-01" }, base.email, new Date("2026-01-01")), false);
  assert.equal(canAcceptInvitation(base, "ADULT@example.com", new Date("2026-01-01")), true);
});

test("PWA manifest and required icon files are present", () => {
  const root = process.cwd();
  assert.match(fs.readFileSync(path.join(root, "app/manifest.ts"), "utf8"), /display:\s*"standalone"/);
  for (const file of ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
    assert.ok(fs.statSync(path.join(root, "public", file)).size > 1000, `${file} should be a real icon`);
  }
});

test("logout invalidates the server-managed session before expiring the cookie", () => {
  const auth = fs.readFileSync(path.join(process.cwd(), "lib/server/auth.ts"), "utf8");
  const route = fs.readFileSync(path.join(process.cwd(), "app/api/auth/logout/route.ts"), "utf8");
  assert.match(route, /await clearSession\(\)/);
  assert.match(auth, /DELETE FROM sessions WHERE id=\$1/);
  assert.match(auth, /expires: new Date\(0\)/);
});

test("module data is stored in PostgreSQL tables rather than an in-memory fallback", () => {
  const schema = fs.readFileSync(path.join(process.cwd(), "lib/schema.ts"), "utf8");
  for (const table of ["events", "journal_posts", "health_records", "preferences", "family_memberships"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.doesNotMatch(fs.readFileSync(path.join(process.cwd(), "lib/db.ts"), "utf8"), /in-memory|new Map/i);
});

test("all five existing modules still have page entry points", () => {
  for (const moduleName of ["home", "calendar", "health", "journal", "profile"]) {
    assert.ok(fs.existsSync(path.join(process.cwd(), "app", moduleName, "page.tsx")));
  }
});
