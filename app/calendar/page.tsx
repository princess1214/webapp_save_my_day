"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAssistMyDayStore } from "../../lib/assistmyday-store";
import {
  apiCreateEvent,
  apiDeleteEvent,
  apiGetEvents,
  apiUpdateEvent,
} from "../../lib/api-client";

type EventCategory = "health" | "school" | "event" | "finance";
type Importance = "low" | "normal" | "high";
type Recurrence =
  | "do-not-repeat"
  | "weekly"
  | "monthly"
  | "annually"
  | "custom";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time: string;
  allDay?: boolean;
  durationMinutes?: number;
  category: EventCategory;
  memberIds: string[];
  notes?: string;
  location?: string;
  pinned?: boolean;
  importance: Importance;
  recurrence: Recurrence;
  recurrenceEndDate?: string;
  recurrenceDays?: string[];
  recurrenceEveryHours?: string;
  reminderMinutes?: string;
  imageDataUrl?: string;
};

type VisionExtractResult = {
  provider: string;
  title?: string;
  notes?: string;
  extractedDate?: string;
  extractedTime?: string;
  extractedLocation?: string;
  durationMinutes?: number;
  isReliable?: boolean;
};

type FamilyMember = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  birthday?: string;
  color?: string;
  type?: "kid" | "pet" | "adult";
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function filterEventsForMemberView(events: CalendarEvent[], selectedMemberId: string) {
  if (selectedMemberId !== "all") {
    return events.filter((event) => !event.id.startsWith("us-fed-"));
  }
  return events;
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function formatDisplayTime(
  time24: string,
  timeFormat: "12h" | "24h" = "12h"
) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);

  if (timeFormat === "24h") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function normalizeExtractedDate(input: string) {
  if (!input) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const parts = input.split("/").map((part) => Number(part));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return "";
  }
  const [month, day, yearRaw] = parts;
  const year = yearRaw ? (yearRaw < 100 ? 2000 + yearRaw : yearRaw) : new Date().getFullYear();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeExtractedTime(input: string) {
  if (!input) return "";
  const trimmed = input.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2] || "0");
    const suffix = ampmMatch[3].toUpperCase();
    if (suffix === "PM" && hour < 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return "";
}

function formatFriendlyDate(
  dateStr: string,
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" = "MM/DD/YYYY",
  withWeekday = false
) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  const locale = dateFormat === "DD/MM/YYYY" ? "en-GB" : "en-US";

  return date.toLocaleDateString(locale, {
    weekday: withWeekday ? "short" : undefined,
    month: "short",
    day: "numeric",
  });
}

function formatMonthLabel(
  year: number,
  month: number,
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY"
) {
  return new Date(year, month, 1).toLocaleDateString(
    dateFormat === "DD/MM/YYYY" ? "en-GB" : "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function getWeekdayLabels(weekStartDay: "Sunday" | "Monday") {
  const sunday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return weekStartDay === "Monday" ? monday : sunday;
}

function getWeekdayIndex(date: Date, weekStartDay: "Sunday" | "Monday") {
  const day = date.getDay();
  if (weekStartDay === "Monday") {
    return day === 0 ? 6 : day - 1;
  }
  return day;
}

function getStartOfWeek(date: Date, weekStartDay: "Sunday" | "Monday") {
  const copy = new Date(date);
  const offset = getWeekdayIndex(copy, weekStartDay);
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function getMonthCells(
  year: number,
  month: number,
  weekStartDay: "Sunday" | "Monday"
) {
  const firstDay = new Date(year, month, 1);
  const startIndex = getWeekdayIndex(firstDay, weekStartDay);
  const gridStart = new Date(year, month, 1);
  gridStart.setDate(gridStart.getDate() - startIndex);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return {
      date,
      currentMonth: date.getMonth() === month,
    };
  });
}

function getCategoryStyle(category: EventCategory, darkMode: boolean) {
  switch (category) {
    case "health":
      return {
        dot: "bg-amber-400",
        badge: darkMode
          ? "bg-amber-500/15 text-amber-300"
          : "bg-amber-50 text-amber-700",
      };
    case "school":
      return {
        dot: "bg-emerald-500",
        badge: darkMode
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-emerald-50 text-emerald-700",
      };
    case "finance":
      return {
        dot: "bg-sky-500",
        badge: darkMode
          ? "bg-sky-500/15 text-sky-300"
          : "bg-sky-50 text-sky-700",
      };
    case "event":
    default:
      return {
        dot: "bg-violet-500",
        badge: darkMode
          ? "bg-violet-500/15 text-violet-300"
          : "bg-violet-50 text-violet-700",
      };
  }
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white";

const categoryOptions: Array<"all" | EventCategory> = [
  "all",
  "health",
  "school",
  "event",
  "finance",
];

const recurrenceOptions: Recurrence[] = [
  "do-not-repeat",
  "weekly",
  "monthly",
  "annually",
  "custom",
];

const importanceOptions: Importance[] = ["low", "normal", "high"];

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const today = new Date();
  const [todayKey] = useState(() => formatDateKey(new Date()));

  const store = useAssistMyDayStore() as any;
  const {
    familyMembers = [],
    appPreferences,
    setEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getUpcomingEvents,
  } = store;

  const [mounted, setMounted] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    "all" | EventCategory
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(todayKey);
  const [newTime, setNewTime] = useState("09:00");
  const [newEndDate, setNewEndDate] = useState("");
  const [newDurationMinutes, setNewDurationMinutes] = useState("60");
  const [newAllDay, setNewAllDay] = useState(false);
  const [newCategory, setNewCategory] = useState<EventCategory>("event");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPinned, setNewPinned] = useState(false);
  const [newImportance, setNewImportance] = useState<Importance>("normal");
  const [newRecurrence, setNewRecurrence] =
    useState<Recurrence>("do-not-repeat");
  const [newRecurrenceEndDate, setNewRecurrenceEndDate] = useState("");
  const [newRecurrenceDays, setNewRecurrenceDays] = useState<string[]>([]);
  const [newRecurrenceEveryHours, setNewRecurrenceEveryHours] = useState("");
  const [newReminderMinutes, setNewReminderMinutes] = useState("60");
  const [newImageDataUrl, setNewImageDataUrl] = useState("");
  
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadMimeType, setUploadMimeType] = useState("");
  const [visionExtracting, setVisionExtracting] = useState(false);
  const [visionMessage, setVisionMessage] = useState("");
  const [visionUsageRemaining, setVisionUsageRemaining] = useState(3);
  const [visionFreezeUntil, setVisionFreezeUntil] = useState<string | null>(null);
  const [activeReminder, setActiveReminder] = useState<CalendarEvent | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const imageExtractionEnabled = false;

  const prefs = {
    themeMode: appPreferences?.themeMode ?? "system",
    dateFormat: appPreferences?.dateFormat ?? "MM/DD/YYYY",
    timeFormat: appPreferences?.timeFormat ?? "12h",
    weekStartDay: appPreferences?.weekStartDay ?? "Sunday",
  } as const;

  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setSystemPrefersDark(mq.matches);

      const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      } else {
        mq.addListener(handler);
        return () => mq.removeListener(handler);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setEventsLoading(true);
      setEventsError("");
      try {
        const remoteEvents = await apiGetEvents();
        if (!cancelled) {
          setEvents?.(remoteEvents);
        }
      } catch {
        if (!cancelled) {
          setEventsError("Could not sync events. Showing cached data.");
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [setEvents]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("assistmyday_vision_usage");
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as { count: number; freezeUntil?: string };
      const freezeActive = data.freezeUntil && new Date(data.freezeUntil).getTime() > Date.now();
      setVisionUsageRemaining(freezeActive ? 0 : Math.max(0, 3 - (data.count || 0)));
      setVisionFreezeUntil(freezeActive ? data.freezeUntil || null : null);
    } catch {
      // ignore invalid local usage cache
    }
  }, []);

  useEffect(() => {
    if (!showCreateSheet) return;
    const q = addressQuery.trim();
    if (q.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(`/api/calendar/address-suggest?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const suggestions = (data?.suggestions || []) as string[];
        setAddressSuggestions(suggestions);
        setShowAddressSuggestions(suggestions.length > 0);
      } catch {
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [addressQuery, showCreateSheet]);

  const isDarkMode =
    prefs.themeMode === "dark" ||
    (prefs.themeMode === "system" && systemPrefersDark);

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(prefs.weekStartDay),
    [prefs.weekStartDay]
  );

  const monthCells = useMemo(
    () => getMonthCells(currentYear, currentMonth, prefs.weekStartDay),
    [currentYear, currentMonth, prefs.weekStartDay]
  );

  const weekDates = useMemo(() => {
    const start = getStartOfWeek(parseDateKey(selectedDate), prefs.weekStartDay);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate, prefs.weekStartDay]);

  const selectedMember =
    familyMembers.find((member: FamilyMember) => member.id === selectedMemberId) ??
    familyMembers[0];

  const selectedDayEvents = useMemo(() => {
    const events = (getEventsForDate?.(
      selectedDate,
      selectedMemberId,
      selectedCategoryFilter,
      searchTerm
    ) || []) as CalendarEvent[];
    return filterEventsForMemberView(events, selectedMemberId);
  }, [
    getEventsForDate,
    selectedDate,
    selectedMemberId,
    selectedCategoryFilter,
    searchTerm,
  ]);

  const upcomingEvents = useMemo(() => {
    const events = (getUpcomingEvents?.(todayKey, selectedMemberId, 3) ||
      []) as CalendarEvent[];
    return filterEventsForMemberView(events, selectedMemberId);
  }, [getUpcomingEvents, todayKey, selectedMemberId]);

  const eventCountByDate = useMemo(() => {
    const map = new Map<string, number>();

    monthCells.forEach((cell) => {
      const key = formatDateKey(cell.date);
      const count = filterEventsForMemberView((( 
        getEventsForDate?.(key, selectedMemberId, selectedCategoryFilter, searchTerm) || []
      ) as CalendarEvent[]), selectedMemberId).length;
      map.set(key, count);
    });

    return map;
  }, [
    monthCells,
    getEventsForDate,
    selectedMemberId,
    selectedCategoryFilter,
    searchTerm,
  ]);

  const spanningEventByDate = useMemo(() => {
    const map = new Map<string, boolean>();
    monthCells.forEach((cell) => {
      const key = formatDateKey(cell.date);
      const hasSpan = filterEventsForMemberView(((getEventsForDate?.(key, selectedMemberId, selectedCategoryFilter, searchTerm) || []) as CalendarEvent[]), selectedMemberId).some(
        (event) => (event.endDate || event.date) > event.date
      );
      map.set(key, hasSpan);
    });
    return map;
  }, [monthCells, getEventsForDate, selectedMemberId, selectedCategoryFilter, searchTerm]);

  useEffect(() => {
    const d = parseDateKey(selectedDate);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  }, [selectedDate]);

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    const date = searchParams.get("date");
    if (!eventId) return;
    const eventDate = date || todayKey;
    const baseEventId = eventId.includes("_") ? eventId.split("_")[0] : eventId;
    const dayEvents = (getEventsForDate?.(eventDate, "all", "all", "") || []) as CalendarEvent[];
    const target =
      dayEvents.find((event) => event.id === eventId) ||
      dayEvents.find((event) => event.id === `${baseEventId}_${eventDate}`) ||
      (store.events || []).find((event: CalendarEvent) => event.id === baseEventId);
    if (target) {
      setSelectedDate(target.date || eventDate);
      openEditEvent(target);
    }
  }, [searchParams, store.events, getEventsForDate, todayKey]);

  useEffect(() => {
    const reminderKey = "assistmyday_reminder_seen";
    const seenRaw =
      typeof window !== "undefined" ? localStorage.getItem(reminderKey) : null;
    const seen: Record<string, number> = seenRaw ? JSON.parse(seenRaw) : {};

    const timer = window.setInterval(() => {
      const allUpcoming = (getUpcomingEvents?.(todayKey, "all", 30) || []) as CalendarEvent[];
      const now = Date.now();

      const due = allUpcoming.find((event) => {
        if (!event.date || !event.time) return false;
        const minutesBefore = Number(event.reminderMinutes || "0");
        const triggerTs =
          new Date(`${event.date}T${event.time || "00:00"}:00`).getTime() -
          minutesBefore * 60 * 1000;
        const idKey = `${event.id}-${event.date}`;
        if (now < triggerTs || now > triggerTs + 5 * 60 * 1000) return false;
        if (seen[idKey]) return false;
        seen[idKey] = now;
        localStorage.setItem(reminderKey, JSON.stringify(seen));
        return true;
      });

      if (due) {
        setActiveReminder(due);
        window.setTimeout(() => setActiveReminder(null), 5 * 60 * 1000);
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, [getUpcomingEvents, todayKey]);

  function resetCreateForm() {
    setFormMode("create");
    setEditingEventId(null);
    setEditingOccurrenceDate(null);
    setNewTitle("");
    setNewDate(selectedDate);
    setNewTime("09:00");
    setNewEndDate(selectedDate);
    setNewDurationMinutes("60");
    setNewAllDay(false);
    setNewCategory("event");
    setNewMemberIds(
      selectedMemberId !== "all" && selectedMemberId ? [selectedMemberId] : []
    );
    setNewLocation("");
    setNewNotes("");
    setNewPinned(false);
    setNewImportance("normal");
    setNewRecurrence("do-not-repeat");
    setNewRecurrenceEndDate("");
    setNewRecurrenceDays([]);
    setNewRecurrenceEveryHours("");
    setNewReminderMinutes("60");
    setNewImageDataUrl("");
    setAddressQuery("");
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setUploadPreview("");
    setUploadMimeType("");
    setVisionMessage("");
  }

  function openCreateEvent() {
    resetCreateForm();
    setFormMode("create");
    setShowCreateSheet(true);
  }

  function openEditEvent(event: CalendarEvent) {
    setFormMode("edit");
    setEditingEventId(event.id.includes("_") ? event.id.split("_")[0] : event.id);
    setEditingOccurrenceDate(event.date);
    setNewTitle(event.title);
    setNewDate(event.date);
    setNewTime(event.time || "09:00");
    setNewEndDate(event.endDate || event.date);
    setNewDurationMinutes(String(event.durationMinutes || 60));
    setNewAllDay(Boolean(event.allDay));
    setNewCategory(event.category);
    setNewMemberIds(event.memberIds.filter((id) => id !== "all"));
    setNewLocation(event.location || "");
    setNewNotes(event.notes || "");
    setNewPinned(Boolean(event.pinned));
    setNewImportance(event.importance || "normal");
    setNewRecurrence(event.recurrence || "do-not-repeat");
    setNewRecurrenceEndDate(event.recurrenceEndDate || "");
    setNewRecurrenceDays(event.recurrenceDays || []);
    setNewRecurrenceEveryHours(event.recurrenceEveryHours || "");
    setNewReminderMinutes(event.reminderMinutes || "60");
    setNewImageDataUrl(event.imageDataUrl || "");
    setAddressQuery(event.location || "");
    setShowAddressSuggestions(false);
    setUploadPreview(event.imageDataUrl || "");
    setShowCreateSheet(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMimeType(file.type || "");
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setUploadPreview(result);
      setNewImageDataUrl(result);
      setVisionMessage("Image uploaded. Image-to-event extraction is temporarily disabled.");
    };
    reader.readAsDataURL(file);
  }

  async function handleReadEventFromImage() {
    if (!uploadPreview) {
      setVisionMessage("Please upload an image first.");
      return;
    }

    if (visionFreezeUntil && new Date(visionFreezeUntil).getTime() > Date.now()) {
      setVisionMessage(`Image reading is frozen until ${new Date(visionFreezeUntil).toLocaleString()}.`);
      return;
    }

    if (visionUsageRemaining <= 0) {
      const freezeUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      localStorage.setItem("assistmyday_vision_usage", JSON.stringify({ count: 3, freezeUntil }));
      setVisionFreezeUntil(freezeUntil);
      setVisionMessage(`Usage limit reached. Try again after ${new Date(freezeUntil).toLocaleTimeString()}.`);
      return;
    }

    setVisionExtracting(true);
    setVisionMessage("");
    try {
      const res = await fetch("/api/calendar/vision-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: uploadPreview }),
      });
      const data = (await res.json()) as VisionExtractResult;
      const date = normalizeExtractedDate(data.extractedDate || "");
      const time = normalizeExtractedTime(data.extractedTime || "");
      const hasCoreFields = Boolean(
        data.title?.trim() &&
          date &&
          time &&
          data.extractedLocation?.trim()
      );

      if (!data.isReliable || !hasCoreFields) {
        setNewTitle("");
        setNewDate("");
        setNewTime("");
        setNewEndDate("");
        setNewDurationMinutes("");
        setNewLocation("");
        setAddressQuery("");
        setVisionMessage("Could not reliably read event details. Please fill in manually.");
      } else {
        setNewTitle(data.title?.trim() || "");
        if (data.notes) setNewNotes(data.notes);
        setNewLocation(data.extractedLocation?.trim() || "");
        setAddressQuery(data.extractedLocation?.trim() || "");
        setNewDate(date);
        setNewEndDate(date);
        setNewTime(time);
        if (data.durationMinutes && data.durationMinutes > 0) {
          setNewDurationMinutes(String(data.durationMinutes));
        }
      }
      setNewRecurrence("do-not-repeat");

      const currentRaw = localStorage.getItem("assistmyday_vision_usage");
      const current = currentRaw ? JSON.parse(currentRaw) : { count: 0 };
      const nextCount = (current.count || 0) + 1;
      const nextRemaining = Math.max(0, 3 - nextCount);
      const freezeUntil = nextCount >= 3 ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() : null;
      localStorage.setItem(
        "assistmyday_vision_usage",
        JSON.stringify({ count: nextCount >= 3 ? 3 : nextCount, freezeUntil })
      );
      setVisionUsageRemaining(nextRemaining);
      setVisionFreezeUntil(freezeUntil);

      if (data.isReliable && hasCoreFields) {
        setVisionMessage(
          nextRemaining > 0
            ? `Event details extracted. ${nextRemaining} image read(s) left this cycle.`
            : "Event details extracted. Limit reached, 4-hour freeze has started."
        );
      }
    } catch {
      setVisionMessage("We couldn't read this image. Please try another image.");
    } finally {
      setVisionExtracting(false);
    }
  }

  function toggleMemberForEvent(memberId: string) {
    setNewMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }

  function toggleRecurrenceDay(day: string) {
    setNewRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  }

  async function handleSaveEvent() {
    if (!newTitle.trim()) return;
    if (!newDate) return;
    if (!newAllDay && !newTime) return;
    const effectiveEndDate = (newEndDate || newDate) < newDate ? newDate : (newEndDate || newDate);

    const baseId =
      formMode === "edit" && editingEventId
        ? editingEventId
        : `evt-${Date.now()}`;

    const payload: CalendarEvent = {
      id: baseId,
      title: newTitle.trim(),
      date: newDate,
      endDate: effectiveEndDate,
      time: newAllDay ? "00:00" : newTime,
      durationMinutes: newAllDay ? 1440 : Number(newDurationMinutes) || 60,
      allDay: newAllDay,
      category: newCategory,
      memberIds: newMemberIds.length > 0 ? newMemberIds : ["all"],
      notes: newNotes.trim(),
      location: newLocation.trim(),
      pinned: newPinned,
      importance: newImportance,
      recurrence: newRecurrence,
      recurrenceEndDate: newRecurrenceEndDate,
      recurrenceDays:
        newRecurrence === "custom" && newRecurrenceDays.length > 0
          ? newRecurrenceDays
          : [],
      recurrenceEveryHours:
        newRecurrence === "custom" ? newRecurrenceEveryHours : "",
      reminderMinutes: newReminderMinutes,
      imageDataUrl: newImageDataUrl || uploadPreview,
    };

    setEventsError("");

    try {
      if (formMode === "edit") {
        const saved = await apiUpdateEvent(baseId, payload);
        updateEvent?.(saved);
      } else {
        const created = await apiCreateEvent(payload);
        addEvent?.(created);
      }

      setShowCreateSheet(false);
      resetCreateForm();
    } catch {
      setEventsError("Failed to save event. Please try again.");
    }
  }


  async function handleDeleteEditingEvent() {
    if (!editingEventId) return;

    const isRecurring = newRecurrence !== "do-not-repeat";

    if (!isRecurring) {
      const ok = window.confirm("Delete this event?");
      if (!ok) return;

      try {
        setEventsError("");
        await apiDeleteEvent(editingEventId);
        deleteEvent?.(editingEventId);
        setShowCreateSheet(false);
        resetCreateForm();
      } catch {
        setEventsError("Failed to delete event. Please try again.");
      }
      return;
    }

    const deleteSeries = window.confirm(
      "This is a recurring event.\n\nPress OK to delete the entire recurring series.\nPress Cancel to choose deleting only this occurrence."
    );

    if (deleteSeries) {
      try {
        setEventsError("");
        await apiDeleteEvent(editingEventId);
        deleteEvent?.(editingEventId);
        setShowCreateSheet(false);
        resetCreateForm();
      } catch {
        setEventsError("Failed to delete event. Please try again.");
      }
      return;
    }

    const deleteOnlyThisOne = window.confirm(
      `Delete only this occurrence on ${editingOccurrenceDate || newDate}?`
    );

    if (!deleteOnlyThisOne) return;

    const baseEvent = (store.events || []).find((event: CalendarEvent) => event.id === editingEventId);
    if (!baseEvent) return;

    const nextEvent: CalendarEvent = {
      ...baseEvent,
      excludedDates: Array.from(
        new Set([...(baseEvent.excludedDates || []), editingOccurrenceDate || newDate])
      ),
    };

    try {
      setEventsError("");
      const saved = await apiUpdateEvent(editingEventId, nextEvent);
      updateEvent?.(saved);
      setShowCreateSheet(false);
      resetCreateForm();
    } catch {
      setEventsError("Failed to update recurring event. Please try again.");
    }
  }


  function goPrevMonth() {
    if (viewMode === "month") {
      const next = new Date(currentYear, currentMonth - 1, 1);
      setCurrentYear(next.getFullYear());
      setCurrentMonth(next.getMonth());
      return;
    }

    const d = parseDateKey(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(formatDateKey(d));
  }

  function goNextMonth() {
    if (viewMode === "month") {
      const next = new Date(currentYear, currentMonth + 1, 1);
      setCurrentYear(next.getFullYear());
      setCurrentMonth(next.getMonth());
      return;
    }

    const d = parseDateKey(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(formatDateKey(d));
  }

  function goToday() {
    const today = parseDateKey(todayKey);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayKey);
  }

  function renderEventRow(event: CalendarEvent) {
    const style = getCategoryStyle(event.category, isDarkMode);
    const visibleId = event.id.includes("_") ? event.id.split("_")[0] : event.id;

    return (
      <div
        key={`${event.id}-${event.date}-${event.time}`}
        className={cn(
          "rounded-2xl border p-4",
          isDarkMode
            ? "border-slate-800 bg-slate-900"
            : "border-slate-200 bg-white"
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn("mt-1 h-3 w-3 rounded-full", style.dot)} />

          <button
            onClick={() =>
              openEditEvent({
                ...event,
                id: visibleId,
              })
            }
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "text-base font-semibold",
                  isDarkMode ? "text-slate-100" : "text-slate-900"
                )}
              >
                {event.title}
              </h3>

              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                  style.badge
                )}
              >
                {event.category}
              </span>

              {event.pinned ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                    isDarkMode
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  pinned
                </span>
              ) : null}

              {event.recurrence !== "do-not-repeat" ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                    isDarkMode
                      ? "bg-slate-800 text-slate-300"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {event.recurrence}
                </span>
              ) : null}
            </div>

            <p
              className={cn(
                "mt-1 text-sm",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}
            >
              {event.allDay
                ? "All day"
                : `${formatDisplayTime(event.time, prefs.timeFormat)}${
                    event.durationMinutes ? ` · ${event.durationMinutes} min` : ""
                  }`}
            </p>

            <p
              className={cn(
                "mt-2 text-xs",
                isDarkMode ? "text-slate-500" : "text-slate-400"
              )}
            >
              For:{" "}
              {familyMembers
                .filter((member: FamilyMember) => event.memberIds.includes(member.id))
                .map((member: FamilyMember) => member.name)
                .join(", ") || "Family"}
            </p>

            {event.location ? (
              <p
                className={cn(
                  "mt-1 truncate text-xs",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                📍 {event.location}
              </p>
            ) : null}

            {event.notes ? (
              <p
                className={cn(
                  "mt-2 line-clamp-2 text-xs",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                {event.notes}
              </p>
            ) : null}

            {event.imageDataUrl ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img src={event.imageDataUrl} alt="Event attachment" className="h-20 w-full object-cover" />
              </div>
            ) : null}
          </button>
        </div>
      </div>
    );
  }
  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] text-slate-900">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm" />
      </main>
    );
  }

  return (
    <main
      className={cn(
        "min-h-screen",
        isDarkMode ? "bg-[#0F172A] text-slate-100" : "bg-[#F7F8FA] text-slate-900"
      )}
    >
      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-md flex-col shadow-sm",
          isDarkMode ? "bg-slate-950" : "bg-white"
        )}
      >
        <header
          className={cn(
            "sticky top-0 z-20 border-b px-4 pb-3 pt-4 backdrop-blur",
            isDarkMode
              ? "border-slate-800 bg-slate-950/95"
              : "border-slate-100 bg-white/95"
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p
                className={cn(
                  "text-xs uppercase tracking-[0.16em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                AssistMyDay
              </p>
              <h1 className="text-lg font-semibold">Calendar</h1>
            </div>

            <button
              onClick={openCreateEvent}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              + Event
            </button>
          </div>

          <div
            className={cn(
              "rounded-3xl px-4 py-4",
              isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50"
            )}
          >
            <p className="text-lg font-semibold">
              Shared schedule for{" "}
              <span className="text-emerald-600">
                {selectedMemberId === "all" ? "your family" : selectedMember?.name}
              </span>
            </p>
            <p
              className={cn(
                "mt-1 text-sm",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}
            >
              Keep routines, appointments, reminders, birthdays, and plans in one place.
            </p>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {familyMembers.map((member: FamilyMember) => {
              const active = selectedMemberId === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                    active
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : isDarkMode
                      ? "border-slate-700 bg-slate-900 text-slate-200"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-base",
                      active ? "bg-white/20" : member.color || "bg-slate-100"
                    )}
                  >
                    {member.avatar}
                  </span>
                  <span className="whitespace-nowrap font-medium">
                    {member.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, notes, place..."
              className={cn(
                "w-full rounded-2xl border px-4 py-3 text-sm outline-none",
                isDarkMode
                  ? "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                  : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400"
              )}
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div
              className={cn(
                "flex rounded-full p-1",
                isDarkMode ? "bg-slate-900" : "bg-slate-100"
              )}
            >
              <button
                onClick={() => setViewMode("month")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  viewMode === "month"
                    ? isDarkMode
                      ? "bg-slate-800 font-semibold text-white shadow-sm"
                      : "bg-white font-semibold text-slate-900 shadow-sm"
                    : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
                )}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  viewMode === "week"
                    ? isDarkMode
                      ? "bg-slate-800 font-semibold text-white shadow-sm"
                      : "bg-white font-semibold text-slate-900 shadow-sm"
                    : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
                )}
              >
                Week
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goPrevMonth}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm",
                  isDarkMode
                    ? "border-slate-700 bg-slate-900 text-slate-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                ←
              </button>
              <button
                onClick={goNextMonth}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm",
                  isDarkMode
                    ? "border-slate-700 bg-slate-900 text-slate-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                →
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {viewMode === "month"
                ? formatMonthLabel(currentYear, currentMonth, prefs.dateFormat)
                : `Week of ${formatFriendlyDate(
                    formatDateKey(weekDates[0]),
                    prefs.dateFormat
                  )}`}
            </h2>
            <button onClick={goToday} className="text-sm font-medium text-emerald-600">
              Today
            </button>
          </div>
        </header>

        <div className="flex-1 px-4 pb-24 pt-4">
          {activeReminder ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⏰ Reminder: {activeReminder.title} ·{" "}
              {formatFriendlyDate(activeReminder.date, prefs.dateFormat)}{" "}
              {activeReminder.allDay ? "All day" : formatDisplayTime(activeReminder.time, prefs.timeFormat)}
            </div>
          ) : null}
          {eventsLoading ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Syncing events...
            </div>
          ) : null}
          {eventsError ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {eventsError}
            </div>
          ) : null}
          {viewMode === "month" ? (
            <section className="mb-6">
              <div className="mb-2 grid grid-cols-7 gap-2">
                {weekdayLabels.map((day) => (
                  <div
                    key={day}
                    className={cn(
                      "text-center text-[11px] font-semibold uppercase tracking-[0.12em]",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthCells.map((cell) => {
                  const key = formatDateKey(cell.date);
                  const isSelected = key === selectedDate;
                  const isToday = key === todayKey;
                  const count = eventCountByDate.get(key) ?? 0;
                  const hasSpan = spanningEventByDate.get(key);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        "min-h-[72px] rounded-2xl border p-2 text-left transition",
                        isSelected
                          ? isDarkMode
                            ? "border-2 border-emerald-500 bg-slate-900"
                            : "border-2 border-emerald-500 bg-white"
                          : isDarkMode
                          ? "border-slate-800 bg-slate-900 hover:border-slate-700"
                          : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100",
                        !cell.currentMonth && "opacity-45"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                            isToday
                              ? "bg-emerald-600 font-semibold text-white"
                              : isSelected
                              ? "font-semibold text-emerald-600"
                              : isDarkMode
                              ? "text-slate-300"
                              : "text-slate-700"
                          )}
                        >
                          {cell.date.getDate()}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1">
                        {count > 0 ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span
                              className={cn(
                                "text-[10px]",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )}
                            >
                              {count}
                            </span>
                          </>
                        ) : (
                          <span
                            className={cn(
                              "text-[10px]",
                              isDarkMode ? "text-slate-700" : "text-slate-300"
                            )}
                          >
                            —
                          </span>
                        )}
                      </div>
                      {hasSpan ? (
                        <div className="mt-1 h-1 w-full rounded-full bg-emerald-400/70" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="mb-6">
              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((date, idx) => {
                  const key = formatDateKey(date);
                  const isSelected = key === selectedDate;
                  const isToday = key === todayKey;
                  const count = filterEventsForMemberView(((
                    getEventsForDate?.(
                      key,
                      selectedMemberId,
                      selectedCategoryFilter,
                      searchTerm
                    ) || []
                  ) as CalendarEvent[]), selectedMemberId).length;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        "rounded-3xl border px-2 py-3 text-center transition",
                        isSelected
                          ? isDarkMode
                            ? "border-2 border-emerald-500 bg-slate-900"
                            : "border-2 border-emerald-500 bg-white"
                          : isDarkMode
                          ? "border-slate-800 bg-slate-900 hover:border-slate-700"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <div
                        className={cn(
                          "text-[11px] uppercase tracking-[0.12em]",
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        )}
                      >
                        {weekdayLabels[idx]}
                      </div>
                      <div
                        className={cn(
                          "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-base",
                          isToday
                            ? "bg-emerald-600 font-semibold text-white"
                            : isSelected
                            ? "font-semibold text-emerald-600"
                            : isDarkMode
                            ? "text-slate-200"
                            : "text-slate-800"
                        )}
                      >
                        {date.getDate()}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-[10px]",
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        )}
                      >
                        {count > 0 ? `${count} evt` : "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-6">
            <div className="mb-3 overflow-x-auto">
              <div className="flex gap-2">
                {categoryOptions.map((category) => {
                  const active = selectedCategoryFilter === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategoryFilter(category)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-2 text-sm capitalize transition",
                        active
                          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                          : isDarkMode
                          ? "border-slate-700 bg-slate-900 text-slate-300"
                          : "border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                Selected day
              </div>
              <div
                className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                {formatFriendlyDate(selectedDate, prefs.dateFormat, true)}
              </div>
            </div>

            <div className="space-y-3">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event: CalendarEvent) => renderEventRow(event))
              ) : (
                <div
                  className={cn(
                    "rounded-2xl border border-dashed px-4 py-6 text-center",
                    isDarkMode
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-200 bg-slate-50"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-slate-300" : "text-slate-700"
                    )}
                  >
                    No events · tap + to create one
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                Upcoming events
              </div>
              <button
                onClick={() => {
                  setSelectedDate(todayKey);
                  setViewMode("week");
                }}
                className="text-sm font-medium text-emerald-600"
              >
                View week
              </button>
            </div>

            <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event: CalendarEvent) => renderEventRow(event))
              ) : (
                <div
                  className={cn(
                    "rounded-2xl border border-dashed px-4 py-6 text-center text-sm",
                    isDarkMode
                      ? "border-slate-700 bg-slate-900 text-slate-400"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  No upcoming events
                </div>
              )}
            </div>
          </section>
        </div>

        <BottomTabBar active="calendar" darkMode={isDarkMode} />

        {showCreateSheet ? (
          <div className="fixed inset-0 z-30 flex items-end bg-black/35">
            <button
              className="absolute inset-0"
              aria-label="Close event form"
              onClick={() => {
                setShowCreateSheet(false);
                resetCreateForm();
              }}
            />
            <div
              className={cn(
                "relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl px-4 pb-6 pt-3 shadow-2xl",
                isDarkMode ? "bg-slate-950" : "bg-white"
              )}
            >
              <div
                className={cn(
                  "mx-auto mb-3 h-1.5 w-12 rounded-full",
                  isDarkMode ? "bg-slate-700" : "bg-slate-200"
                )}
              />

              <div className="mb-4 flex items-center justify-between">
                <h2
                  className={cn(
                    "text-base font-semibold",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}
                >
                  {formMode === "edit" ? "Edit event" : "Create event"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateSheet(false);
                    resetCreateForm();
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm",
                    isDarkMode
                      ? "bg-slate-800 text-slate-300"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <Field label="Title" darkMode={isDarkMode}>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Doctor visit, school event, bill payment..."
                    className={cn(
                      inputClass,
                      isDarkMode &&
                        "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:bg-slate-900"
                    )}
                  />
                </Field>

                <div>
                  <label
                    className={cn(
                      "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em]",
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    )}
                  >
                    Who is this for
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {familyMembers
                      .filter((member: FamilyMember) => member.id !== "all")
                      .map((member: FamilyMember) => {
                        const active = newMemberIds.includes(member.id);
                        return (
                          <button
                            key={member.id}
                            onClick={() => toggleMemberForEvent(member.id)}
                            className={cn(
                              "rounded-full border px-3 py-2 text-sm transition",
                              active
                                ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                                : isDarkMode
                                ? "border-slate-700 bg-slate-900 text-slate-300"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            )}
                          >
                            {member.avatar} {member.name}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date" darkMode={isDarkMode}>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className={cn(
                        inputClass,
                        isDarkMode &&
                          "border-slate-800 bg-slate-900 text-slate-100 focus:bg-slate-900"
                      )}
                    />
                  </Field>

                  <Field label="Time" darkMode={isDarkMode}>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      disabled={newAllDay}
                      className={cn(
                        inputClass,
                        newAllDay && "cursor-not-allowed opacity-60",
                        isDarkMode &&
                          "border-slate-800 bg-slate-900 text-slate-100 focus:bg-slate-900"
                      )}
                    />
                  </Field>
                </div>

                <ToggleRow
                  title="All-day event"
                  subtitle="Useful for holidays and dates without a specific time"
                  checked={newAllDay}
                  onChange={setNewAllDay}
                  darkMode={isDarkMode}
                />

                <Field label="End date (optional)" darkMode={isDarkMode}>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={newDate || undefined}
                    className={cn(
                      inputClass,
                      isDarkMode &&
                        "border-slate-800 bg-slate-900 text-slate-100 focus:bg-slate-900"
                    )}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Duration (min)" darkMode={isDarkMode}>
                    <input
                      type="number"
                      min={0}
                      value={newDurationMinutes}
                      onChange={(e) => setNewDurationMinutes(e.target.value)}
                      disabled={newAllDay}
                      className={cn(
                        inputClass,
                        newAllDay && "cursor-not-allowed opacity-60",
                        isDarkMode &&
                          "border-slate-800 bg-slate-900 text-slate-100 focus:bg-slate-900"
                      )}
                    />
                  </Field>

                  <Field label="Reminder" darkMode={isDarkMode}>
                    <select
                      value={newReminderMinutes}
                      onChange={(e) => setNewReminderMinutes(e.target.value)}
                      className={cn(
                        inputClass,
                        isDarkMode &&
                          "border-slate-800 bg-slate-900 text-slate-100 focus:bg-slate-900"
                      )}
                    >
                      <option value="0">At time of event</option>
                      <option value="15">15 minutes before</option>
                      <option value="30">30 minutes before</option>
                      <option value="60">1 hour before</option>
                      <option value="1440">1 day before</option>
                    </select>
                  </Field>
                </div>

                <Field label="Category" darkMode={isDarkMode}>
                  <div className="flex flex-wrap gap-2">
                    {(["health", "school", "event", "finance"] as EventCategory[]).map(
                      (item) => (
                        <button
                          key={item}
                          onClick={() => setNewCategory(item)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-sm capitalize transition",
                            newCategory === item
                              ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                              : isDarkMode
                              ? "border-slate-700 bg-slate-900 text-slate-300"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          )}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>
                </Field>

                <Field label="Importance" darkMode={isDarkMode}>
                  <div className="flex flex-wrap gap-2">
                    {importanceOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => setNewImportance(item)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm capitalize transition",
                          newImportance === item
                            ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                            : isDarkMode
                            ? "border-slate-700 bg-slate-900 text-slate-300"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Repeat" darkMode={isDarkMode}>
                  <div className="flex flex-wrap gap-2">
                    {recurrenceOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => setNewRecurrence(item)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          newRecurrence === item
                            ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                            : isDarkMode
                            ? "border-slate-700 bg-slate-900 text-slate-300"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </Field>

                {newRecurrence === "custom" ? (
                  <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 p-4">
                    <div>
                      <label
                        className={cn(
                          "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em]",
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        )}
                      >
                        Repeat on weekdays
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <button
                            key={day}
                            onClick={() => toggleRecurrenceDay(day)}
                            className={cn(
                              "rounded-full border px-3 py-2 text-sm transition",
                              newRecurrenceDays.includes(day)
                                ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                                : isDarkMode
                                ? "border-slate-700 bg-slate-900 text-slate-300"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field label="Or every X hours" darkMode={isDarkMode}>
                      <input
                        type="number"
                        min={1}
                        value={newRecurrenceEveryHours}
                        onChange={(e) => setNewRecurrenceEveryHours(e.target.value)}
                        placeholder="Example: 24"
                        className={cn(
                          inputClass,
                          isDarkMode &&
                            "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:bg-slate-900"
                        )}
                      />
                    </Field>
                  </div>
                ) : null}

                {newRecurrence !== "do-not-repeat" ? (
                  <Field label="Repeat until" darkMode={isDarkMode}>
                    <input
                      type="date"
                      value={newRecurrenceEndDate}
                      onChange={(e) => setNewRecurrenceEndDate(e.target.value)}
                      className={cn(
                        inputClass,
                        isDarkMode &&
                          "border-slate-800 bg-slate-900 text-slate-100 focus:bg-slate-900"
                      )}
                    />
                  </Field>
                ) : null}

                <Field label="Location" darkMode={isDarkMode}>
                  <div className="space-y-2">
                  <input
                    value={addressQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAddressQuery(value);
                      setNewLocation(value);
                    }}
                    placeholder="Clinic, school, home..."
                    className={cn(
                      inputClass,
                      isDarkMode &&
                        "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:bg-slate-900"
                    )}
                  />
                    {isSearchingAddress ? (
                      <p className="text-xs text-slate-400">Searching addresses...</p>
                    ) : null}
                    {showAddressSuggestions ? (
                      <div className={cn("rounded-2xl border p-2", isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white")}>
                        {addressSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setNewLocation(suggestion);
                              setAddressQuery(suggestion);
                              setShowAddressSuggestions(false);
                            }}
                            className={cn("w-full rounded-xl px-3 py-2 text-left text-xs", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50")}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Field>

                <Field label="Notes" darkMode={isDarkMode}>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Anything to remember..."
                    className={cn(
                      "min-h-[100px] w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400",
                      isDarkMode
                        ? "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:bg-slate-900"
                        : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white"
                    )}
                  />
                </Field>

                <Field label="Event image (optional)" darkMode={isDarkMode}>
                  <div className="space-y-3">
                    <input type="file" accept="image/*,application/pdf" onChange={handleImageUpload} />
                    {uploadPreview ? (
                      uploadMimeType === "application/pdf" ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          PDF attached and ready for extraction.
                        </div>
                      ) : (
                        <img src={uploadPreview} alt="Event upload preview" className="h-28 w-full rounded-2xl border border-slate-200 object-cover" />
                      )
                    ) : null}
                    {imageExtractionEnabled ? (
                      <button
                        onClick={handleReadEventFromImage}
                        disabled={visionExtracting}
                        className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {visionExtracting ? "Reading image..." : "Read event from image"}
                      </button>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      Image-to-event extraction is temporarily unavailable. Upload is still supported and we kept the API code for future re-enable.
                    </p>
                    {visionMessage ? (
                      <p className="text-xs text-emerald-600">{visionMessage}</p>
                    ) : null}
                  </div>
                </Field>

                <ToggleRow
                  title="Pin this event"
                  subtitle="Pinned events can appear on Home if that setting is enabled"
                  checked={newPinned}
                  onChange={setNewPinned}
                  darkMode={isDarkMode}
                />

                <button
                  onClick={handleSaveEvent}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  {formMode === "edit" ? "Save event" : "Create event"}
                </button>

                {formMode === "edit" ? (
                  <button
                    onClick={handleDeleteEditingEvent}
                    className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Delete event
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
  darkMode,
}: {
  label: string;
  children: React.ReactNode;
  darkMode?: boolean;
}) {
  return (
    <div>
      <label
        className={cn(
          "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em]",
          darkMode ? "text-slate-500" : "text-slate-400"
        )}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  subtitle,
  checked,
  onChange,
  darkMode,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  darkMode?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl border px-4 py-4",
        darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium", darkMode ? "text-slate-100" : "text-slate-800")}>
          {title}
        </div>
        <div className={cn("mt-1 text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
          {subtitle}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-emerald-500" : darkMode ? "bg-slate-700" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function BottomTabBar({
  active,
  darkMode,
}: {
  active: string;
  darkMode?: boolean;
}) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t",
        darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
      )}
    >
      <TabItem href="/home" label="🏠" text="Home" active={active === "home"} />
      <TabItem href="/calendar" label="📅" text="Calendar" active={active === "calendar"} />
      <TabItem href="/health" label="❤️" text="Health" active={active === "health"} />
      <TabItem href="/journal" label="📷" text="Journal" active={active === "journal"} />
      <TabItem href="/profile" label="👤" text="Profile" active={active === "profile"} />
    </nav>
  );
}


export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageContent />
    </Suspense>
  );
}

function TabItem({
  href,
  label,
  text,
  active,
}: {
  href: string;
  label: string;
  text: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-1 px-2 py-3">
      <div className={active ? "text-emerald-700" : "text-slate-400"}>{label}</div>
      <span
        className={cn(
          "text-[11px]",
          active ? "font-semibold text-emerald-700" : "text-slate-400"
        )}
      >
        {text}
      </span>
    </Link>
  );
}
