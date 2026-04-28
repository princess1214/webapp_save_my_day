type D1BindResult = { results?: Record<string, unknown>[] };

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all(): Promise<D1BindResult>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  DB: D1Database;
}

type EventRecord = {
  id: string;
  title?: string;
  category?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  recurrence?: string;
  notes?: string;
  [key: string]: unknown;
};

function getUserId(req: Request) {
  return req.headers.get("x-user-id") || "demo-user";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-user-id",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function parseNotesPayload(notes: string | null): Partial<EventRecord> {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as { meta?: EventRecord; text?: string };
    return parsed.meta || {};
  } catch {
    return { notes };
  }
}

function serializeNotesPayload(event: EventRecord) {
  return JSON.stringify({
    text: typeof event.notes === "string" ? event.notes : "",
    meta: event,
  });
}

function hydrateEvent(row: Record<string, unknown>) {
  const meta = parseNotesPayload((row.notes as string | null) || null);
  return {
    ...meta,
    id: (row.id as string) || (meta.id as string),
    title: (row.title as string) || (meta.title as string) || "",
    category: (row.category as string) || (meta.category as string) || "event",
    date: (row.date as string) || (meta.date as string) || "",
    time: (row.time as string) || (meta.time as string) || "00:00",
    durationMinutes:
      Number(row.duration_minutes ?? meta.durationMinutes ?? 60) || 60,
    recurrence: (row.recurrence as string) || (meta.recurrence as string) || "do-not-repeat",
    notes: typeof meta.notes === "string" ? meta.notes : "",
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/health" && req.method === "GET") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/events" && req.method === "GET") {
      const userId = getUserId(req);
      const { results } = await env.DB.prepare(
        "SELECT * FROM events WHERE user_id = ? ORDER BY date ASC, time ASC"
      )
        .bind(userId)
        .all();

      return jsonResponse({ events: (results || []).map(hydrateEvent) });
    }

    if (url.pathname === "/events" && req.method === "POST") {
      const userId = getUserId(req);
      const payload = (await req.json()) as EventRecord;
      const now = new Date().toISOString();
      const eventId = payload.id || crypto.randomUUID();

      await env.DB.prepare(
        `INSERT INTO events (
          id, user_id, title, category, date, time, duration_minutes, recurrence, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          eventId,
          userId,
          payload.title || "",
          payload.category || "event",
          payload.date || "",
          payload.time || "00:00",
          Number(payload.durationMinutes || 60),
          payload.recurrence || "do-not-repeat",
          serializeNotesPayload({ ...payload, id: eventId }),
          now,
          now
        )
        .run();

      return jsonResponse({ event: { ...payload, id: eventId } }, 201);
    }

    const eventIdMatch = url.pathname.match(/^\/events\/([^/]+)$/);
    if (eventIdMatch && req.method === "PUT") {
      const userId = getUserId(req);
      const eventId = decodeURIComponent(eventIdMatch[1]);
      const payload = (await req.json()) as EventRecord;
      const now = new Date().toISOString();

      await env.DB.prepare(
        `UPDATE events
         SET title = ?, category = ?, date = ?, time = ?, duration_minutes = ?, recurrence = ?, notes = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
        .bind(
          payload.title || "",
          payload.category || "event",
          payload.date || "",
          payload.time || "00:00",
          Number(payload.durationMinutes || 60),
          payload.recurrence || "do-not-repeat",
          serializeNotesPayload({ ...payload, id: eventId }),
          now,
          eventId,
          userId
        )
        .run();

      return jsonResponse({ event: { ...payload, id: eventId } });
    }

    if (eventIdMatch && req.method === "DELETE") {
      const userId = getUserId(req);
      const eventId = decodeURIComponent(eventIdMatch[1]);

      await env.DB.prepare("DELETE FROM events WHERE id = ? AND user_id = ?")
        .bind(eventId, userId)
        .run();

      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
