"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type FamilyAccount = { accountId: string; email: string; familyRole: "owner" | "admin" | "member"; displayName: string };
type Invitation = { id: string; email: string; role: "admin" | "member"; expires_at: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Request failed");
  return data as T;
}

export default function FamilyPage() {
  const [familyName, setFamilyName] = useState("");
  const [accounts, setAccounts] = useState<FamilyAccount[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const family = await api<{ family: { name: string }; members: FamilyAccount[] }>("/families");
      setFamilyName(family.family?.name || "My Family");
      setAccounts(family.members || []);
      const pending = await api<{ invitations: Invitation[] }>("/family-invitations").catch(() => ({ invitations: [] }));
      setInvitations(pending.invitations || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load family accounts.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      await api("/family-invitations", { method: "POST", body: JSON.stringify({ email, role }) });
      setEmail(""); setMessage("Invitation sent."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invitation failed."); }
    finally { setBusy(false); }
  }

  async function changeRole(accountId: string, nextRole: "admin" | "member") {
    try { await api(`/family-memberships/${encodeURIComponent(accountId)}`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Role update failed."); }
  }

  async function removeAccount(accountId: string) {
    if (!window.confirm("Remove this adult account from your family? Their private data will remain with their account.")) return;
    try { await api(`/family-memberships/${encodeURIComponent(accountId)}`, { method: "DELETE" }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Removal failed."); }
  }

  async function revoke(id: string) {
    try { await api(`/family-invitations/${encodeURIComponent(id)}`, { method: "DELETE" }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Revoke failed."); }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-[max(1rem,env(safe-area-inset-top))] text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-md space-y-5">
        <header className="flex items-center gap-3">
          <Link href="/profile" className="rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">← Back</Link>
          <div><h1 className="text-xl font-semibold">{familyName || "Family accounts"}</h1><p className="text-sm text-slate-500">Secure adult access and invitations</p></div>
        </header>

        {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{message}</div> : null}

        <form onSubmit={invite} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Invite an adult</h2>
          <p className="mt-1 text-sm text-slate-500">Invitations are bound to the recipient’s email and expire after seven days.</p>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="family@example.com" className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950" />
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")} className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
            <option value="member">Member</option><option value="admin">Family admin</option>
          </select>
          <button disabled={busy} className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send secure invitation"}</button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold">Adult accounts</h2>
          <div className="mt-3 space-y-3">{accounts.map((account) => (
            <div key={account.accountId} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="font-medium">{account.displayName}</div><div className="text-sm text-slate-500">{account.email}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-white px-2 py-1 text-xs dark:bg-slate-900">{account.familyRole}</span>
                {account.familyRole !== "owner" ? <><button onClick={() => changeRole(account.accountId, account.familyRole === "admin" ? "member" : "admin")} className="text-xs font-semibold text-emerald-700">Make {account.familyRole === "admin" ? "member" : "admin"}</button><button onClick={() => removeAccount(account.accountId)} className="text-xs font-semibold text-rose-700">Remove</button></> : null}
              </div>
            </div>
          ))}</div>
        </section>

        {invitations.length ? <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold">Pending invitations</h2><div className="mt-3 space-y-2">{invitations.map((invitation) => <div key={invitation.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><div><div className="text-sm font-medium">{invitation.email}</div><div className="text-xs text-slate-500">{invitation.role}</div></div><button onClick={() => revoke(invitation.id)} className="text-sm font-semibold text-rose-700">Revoke</button></div>)}</div></section> : null}
      </div>
    </main>
  );
}
