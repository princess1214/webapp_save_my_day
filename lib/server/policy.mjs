/** Shared authorization rules used by tests and route reviews. */
export function canReadRecord(record, user) {
  return record.ownerId === user.id || (record.visibility === "family" && record.familyId === user.familyId);
}

export function canMutateEvent(record, user) {
  return record.familyId === user.familyId && (record.ownerId === user.id || user.familyRole === "owner" || user.familyRole === "admin");
}

export function canMutatePrivateRecord(record, user) {
  return record.ownerId === user.id;
}

export function canAcceptInvitation(invitation, email, now = new Date()) {
  return !invitation.acceptedAt && !invitation.revokedAt && new Date(invitation.expiresAt) > now && invitation.email.toLowerCase() === email.toLowerCase();
}
