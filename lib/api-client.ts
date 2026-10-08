import type {
  AppPreferences,
  CalendarEvent,
  FamilyMember,
  HealthRecord,
  JournalPost,
  Profile,
} from "./assistmyday-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || `API request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export type CloudData = {
  profile: Partial<Profile> & { accountId?: string; familyId?: string };
  familyMembers: FamilyMember[];
  events: CalendarEvent[];
  journalPosts: JournalPost[];
  healthRecords: HealthRecord[];
  appPreferences: Partial<AppPreferences>;
};

export const apiGetCloudData = () => request<CloudData>("/sync");
export const apiImportLocalData = (data: Partial<CloudData>) =>
  request<{ success: true; imported: Record<string, number>; message: string }>("/import", { method: "POST", body: JSON.stringify(data) });

export async function apiGetEvents() { return (await request<{ events: CalendarEvent[] }>("/events")).events || []; }
export async function apiCreateEvent(event: CalendarEvent) { return (await request<{ event: CalendarEvent }>("/events", { method: "POST", body: JSON.stringify(event) })).event; }
export async function apiUpdateEvent(id: string, event: CalendarEvent) { return (await request<{ event: CalendarEvent }>(`/events/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(event) })).event; }
export async function apiDeleteEvent(id: string) { await request<void>(`/events/${encodeURIComponent(id)}`, { method: "DELETE" }); }

export async function apiCreateJournal(post: JournalPost) { return (await request<{ post: JournalPost }>("/journal", { method: "POST", body: JSON.stringify(post) })).post; }
export async function apiUpdateJournal(post: JournalPost) { return (await request<{ post: JournalPost }>(`/journal/${encodeURIComponent(post.id)}`, { method: "PUT", body: JSON.stringify(post) })).post; }
export async function apiDeleteJournal(id: string) { await request<void>(`/journal/${encodeURIComponent(id)}`, { method: "DELETE" }); }

export async function apiCreateHealthRecord(record: HealthRecord) { return (await request<{ record: HealthRecord }>("/health-records", { method: "POST", body: JSON.stringify(record) })).record; }
export async function apiUpdateHealthRecord(record: HealthRecord) { return (await request<{ record: HealthRecord }>(`/health-records/${encodeURIComponent(record.id)}`, { method: "PUT", body: JSON.stringify(record) })).record; }
export async function apiDeleteHealthRecord(id: string) { await request<void>(`/health-records/${encodeURIComponent(id)}`, { method: "DELETE" }); }

export async function apiUpdateProfile(profile: Partial<Profile>) { return (await request<{ profile: Profile }>("/profile", { method: "PUT", body: JSON.stringify(profile) })).profile; }
export async function apiUpdatePreferences(preferences: Partial<AppPreferences>) { return (await request<{ preferences: AppPreferences }>("/preferences", { method: "PUT", body: JSON.stringify(preferences) })).preferences; }

export async function apiCreateFamilyMember(member: FamilyMember) { return (await request<{ member: FamilyMember }>("/family-members", { method: "POST", body: JSON.stringify(member) })).member; }
export async function apiUpdateFamilyMember(member: FamilyMember) { return (await request<{ member: FamilyMember }>(`/family-members/${encodeURIComponent(member.id)}`, { method: "PUT", body: JSON.stringify(member) })).member; }
export async function apiDeleteFamilyMember(id: string) { await request<void>(`/family-members/${encodeURIComponent(id)}`, { method: "DELETE" }); }

export async function apiChangePassword(currentPassword: string, newPassword: string) {
  return request<{ success: true; signInAgain: true }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function apiDeleteAccount() {
  await request<void>("/profile", { method: "DELETE" });
}
