import type { CalendarEvent } from "./assistmyday-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function getBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return API_BASE_URL.replace(/\/$/, "");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGetEvents(): Promise<CalendarEvent[]> {
  const data = await request<{ events: CalendarEvent[] }>("/events", {
    method: "GET",
  });
  return data.events || [];
}

export async function apiCreateEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const data = await request<{ event: CalendarEvent }>("/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
  return data.event;
}

export async function apiUpdateEvent(
  id: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const data = await request<{ event: CalendarEvent }>(`/events/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(event),
  });
  return data.event;
}

export async function apiDeleteEvent(id: string): Promise<void> {
  await request<void>(`/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
