"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_MEMBER_ID,
  SELF_MEMBER_ID,
  useAssistMyDayStore,
} from "../../lib/assistmyday-store";

type EventCategory = "health" | "school" | "event" | "finance";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  allDay?: boolean;
  durationMinutes?: number;
  category: EventCategory;
  memberIds: string[];
  notes?: string;
  location?: string;
  pinned?: boolean;
  importance: "low" | "normal" | "high";
  recurrence: "do-not-repeat" | "weekly" | "monthly" | "annually" | "custom";
  recurrenceEndDate?: string;
  recurrenceDays?: string[];
  recurrenceEveryHours?: string;
  reminderMinutes?: string;
};

type MomentCategory =
  | "sleep"
  | "feeding"
  | "mood"
  | "milestone"
  | "health"
  | "note";

type MomentItem = {
  id: string;
  title: string;
  text: string;
  category: MomentCategory;
  emoji: string;
  author: string;
  createdAt: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDisplayTime(time24: string, timeFormat: "12h" | "24h" = "12h") {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);

  if (timeFormat === "24h") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatFriendlyDate(
  dateStr: string,
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" = "MM/DD/YYYY"
) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  if (dateFormat === "DD/MM/YYYY") {
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getCategoryStyle(category: CalendarEvent["category"], darkMode: boolean) {
  switch (category) {
    case "health":
      return {
        dot: "bg-amber-400",
        badge: darkMode ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700",
      };
    case "school":
      return {
        dot: "bg-emerald-500",
        badge: darkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700",
      };
    case "finance":
      return {
        dot: "bg-sky-500",
        badge: darkMode ? "bg-sky-500/15 text-sky-300" : "bg-sky-50 text-sky-700",
      };
    case "event":
    default:
      return {
        dot: "bg-violet-500",
        badge: darkMode ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700",
      };
  }
}

function getMomentStyle(category: MomentItem["category"], darkMode: boolean) {
  switch (category) {
    case "sleep":
      return { badge: darkMode ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700" };
    case "feeding":
      return { badge: darkMode ? "bg-orange-500/15 text-orange-300" : "bg-orange-50 text-orange-700" };
    case "mood":
      return { badge: darkMode ? "bg-pink-500/15 text-pink-300" : "bg-pink-50 text-pink-700" };
    case "milestone":
      return { badge: darkMode ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700" };
    case "health":
      return { badge: darkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700" };
    case "note":
    default:
      return { badge: darkMode ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700" };
  }
}

const quickLogOptions: Array<{
  id: MomentCategory;
  label: string;
  emoji: string;
  placeholder: string;
}> = [
  {
    id: "sleep",
    label: "Sleep",
    emoji: "😴",
    placeholder: "How long did they sleep? Any wake-ups...",
  },
  {
    id: "feeding",
    label: "Feeding",
    emoji: "🍼",
    placeholder: "What did they eat? Amount, time...",
  },
  {
    id: "mood",
    label: "Mood",
    emoji: "💛",
    placeholder: "How are they feeling today?",
  },
  {
    id: "milestone",
    label: "Milestone",
    emoji: "🌟",
    placeholder: "What happened? First time? Describe it!",
  },
  {
    id: "health",
    label: "Health",
    emoji: "🩺",
    placeholder: "Symptoms, temperature, medication given...",
  },
  {
    id: "note",
    label: "Note",
    emoji: "📝",
    placeholder: "Write anything you want to remember...",
  },
];

export default function HomePage() {

  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    setTodayKey(new Date().toISOString().slice(0, 10));
  }, []);

  const store = useAssistMyDayStore() as any;
  const {
    profile,
    familyMembers = [],
    getUpcomingEvents,
    getPinnedEvents,
    journalPosts = [],
    addJournalPost,
    appPreferences,
  } = store;

  const [selectedMemberId, setSelectedMemberId] = useState(ALL_MEMBER_ID);
  const displayName = profile?.displayName?.trim() || "New User";

  const [dateLabel, setDateLabel] = useState("");
  const [greeting, setGreeting] = useState("Good morning");
  const [mounted, setMounted] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showQuickLogSheet, setShowQuickLogSheet] = useState(false);
  const [quickLogCategory, setQuickLogCategory] = useState<MomentCategory>("sleep");
  const [quickLogText, setQuickLogText] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [dailyCheerMessage, setDailyCheerMessage] = useState("");
  const [weatherSummary, setWeatherSummary] = useState("");

  const prefs = {
    showPinnedEvents: appPreferences?.showPinnedEvents ?? true,
    displayEventsCount: appPreferences?.displayEventsCount ?? 3,
    timeFormat: appPreferences?.timeFormat ?? "12h",
    dateFormat: appPreferences?.dateFormat ?? "MM/DD/YYYY",
    themeMode: appPreferences?.themeMode ?? "system",
    temperatureUnit: appPreferences?.temperatureUnit ?? "C",
  };

  useEffect(() => {
    setMounted(true);

    const now = new Date();
    const hour = now.getHours();

    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    setDateLabel(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );

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
    const cheers = [
      "You are powerful today.",
      "You have done great already.",
      "Earth cannot spin without you.",
      "Hang in there, you're doing amazing.",
      "You're the warm heart of this home.",
      "Tiny steps still count as giant wins.",
      "Your care makes every day brighter.",
    ];
    const dayOfYear = Math.floor(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000
    );
    setDailyCheerMessage(cheers[dayOfYear % cheers.length]);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setWeatherSummary("Weather unavailable: location permission not granted.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `/api/weather?lat=${latitude}&lon=${longitude}`,
            { cache: "no-store" }
          );
          if (!res.ok) {
            setWeatherSummary("Weather unavailable right now.");
            return;
          }
          const data = await res.json();
          const current = data?.current;
          const daily = data?.daily;
          if (!current || !daily) {
            setWeatherSummary("Weather unavailable right now.");
            return;
          }
          const maxC = Number(daily.temperature_2m_max?.[0] ?? current.temperature_2m);
          const minC = Number(daily.temperature_2m_min?.[0] ?? current.temperature_2m);
          const toUnit = (value: number) =>
            prefs.temperatureUnit === "F"
              ? Math.round((value * 9) / 5 + 32)
              : Math.round(value);
          const icon =
            Number(current.precipitation_probability || 0) >= 50
              ? "🌧️"
              : Number(current.weather_code) >= 3
              ? "☁️"
              : "☀️";
          setWeatherSummary(
            `Your location · ${toUnit(minC)}°-${toUnit(maxC)}°${prefs.temperatureUnit} ${icon}`
          );
        } catch {
          setWeatherSummary("Weather unavailable right now.");
        }
      },
      () => setWeatherSummary("Weather unavailable: location permission denied."),
      { timeout: 8000 }
    );
  }, [prefs.temperatureUnit]);

  const isDarkMode =
    prefs.themeMode === "dark" ||
    (prefs.themeMode === "system" && systemPrefersDark);

  const selectableMembers = useMemo(() => {
    return familyMembers || [];
  }, [familyMembers]);

  const actualFamilyMembers = useMemo(() => {
    return (familyMembers || []).filter((member: any) => member.id !== ALL_MEMBER_ID);
  }, [familyMembers]);

  useEffect(() => {
    if (!mounted) return;
    const inviterParam = encodeURIComponent(displayName || "Family Organizer");
    const familyParam = encodeURIComponent(
      actualFamilyMembers.map((member: any) => member.name).join(",")
    );
    const familyId = encodeURIComponent(
      localStorage.getItem("assistmyday_family_id") ||
        localStorage.getItem("assistmyday_account_number") ||
        ""
    );
    setInviteLink(
      `${window.location.origin}/?invite=1&family=${familyParam}&inviter=${inviterParam}&familyId=${familyId}`
    );
  }, [mounted, actualFamilyMembers, displayName]);

  const selectedMember =
    selectableMembers.find((member: any) => member.id === selectedMemberId) ??
    selectableMembers[0];

  const pinnedEvents = useMemo(() => {
    if (!prefs.showPinnedEvents) return [];
    return (getPinnedEvents?.(todayKey, selectedMemberId) || []) as CalendarEvent[];
  }, [getPinnedEvents, todayKey, selectedMemberId, prefs.showPinnedEvents]);

  const upcomingEvents = useMemo(() => {
    const events = (
      (getUpcomingEvents?.(todayKey, selectedMemberId, prefs.displayEventsCount) || []) as CalendarEvent[]
    );
    return events.filter((event) => event.importance !== "low");
  }, [getUpcomingEvents, todayKey, selectedMemberId, prefs.displayEventsCount]);

  const topMoments = useMemo(() => {
    return (journalPosts || [])
      .filter((post: any) => post.visibility === "family")
      .filter((post: any) => {
        if (selectedMemberId === ALL_MEMBER_ID) return true;
        const targets = post.targetMemberIds || [];
        return targets.includes(ALL_MEMBER_ID) || targets.includes(selectedMemberId);
      })
      .slice(0, 3)
      .map((post: any) => ({
        id: post.id,
        title: post.title,
        text: post.text || (post.items || []).map((item: any) => item.text).join(" · "),
        category: post.category,
        emoji:
          post.category === "sleep"
            ? "😴"
            : post.category === "feeding"
            ? "🍼"
            : post.category === "mood"
            ? "💛"
            : post.category === "milestone"
            ? "🌟"
            : post.category === "health"
            ? "🩺"
            : "📝",
        author: post.author,
        createdAt: "Recent",
      }));
  }, [journalPosts, selectedMemberId]);

  const pinnedEvent = pinnedEvents[0] ?? null;

  const quickLogPlaceholder =
    quickLogOptions.find((item) => item.id === quickLogCategory)?.placeholder ??
    "Write anything you want to remember...";

  function openQuickLogWithCategory(category: MomentCategory) {
    setQuickLogCategory(category);
    setShowQuickLogSheet(true);
  }

  function handleSaveQuickLog() {
    if (!quickLogText.trim()) return;

    const titleMap = {
      sleep: "Sleep log",
      feeding: "Feeding log",
      mood: "Mood log",
      milestone: "Milestone log",
      health: "Health log",
      note: "Quick note",
    } as const;

    const defaultMemberId =
      selectedMemberId !== ALL_MEMBER_ID
        ? selectedMemberId
        : SELF_MEMBER_ID;

    addJournalPost?.({
      id: String(Date.now()),
      author: displayName,
      createdAt: new Date().toISOString(),
      targetMemberIds: [defaultMemberId],
      category: quickLogCategory,
      visibility: "family",
      title: titleMap[quickLogCategory],
      contentStyle: "paragraph",
      text: quickLogText.trim(),
      likes: [],
      comments: [],
      imageUrls: [],
    });

    setQuickLogText("");
    setQuickLogCategory("sleep");
    setShowQuickLogSheet(false);
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setInviteCopied(false);
    }
  }

  return (
    <main
      className={cn(
        "app-themed min-h-screen",
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
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1
                className={cn(
                  "text-2xl font-semibold leading-tight",
                  isDarkMode ? "text-white" : "text-slate-900"
                )}
              >
                {greeting}, <span className="text-emerald-600">{displayName}</span> 👋
              </h1>
              <p className={cn("mt-1 text-sm", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                {dateLabel}
              </p>
              <p className={cn("mt-2 text-xs font-medium", isDarkMode ? "text-sky-300" : "text-sky-600")}>
                {weatherSummary || "Loading local weather..."}
              </p>
            </div>

            <div className="flex items-center">
              <Link
                href="/profile"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-emerald-700"
              >
                {displayName.slice(0, 2).toUpperCase()}
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 pb-24 pt-4">
          <section className="mb-6">
            <div
              className={cn(
                "mb-3 rounded-2xl border px-4 py-3 text-sm font-medium",
                isDarkMode
                  ? "border-violet-500/20 bg-violet-500/10 text-violet-200"
                  : "border-violet-100 bg-violet-50 text-violet-700"
              )}
            >
              💜 {dailyCheerMessage}
            </div>
          </section>

          <section className="mb-6">
            <div
              className={cn(
                "mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]",
                isDarkMode ? "text-slate-500" : "text-slate-400"
              )}
            >
              My family
            </div>

            <div className="flex gap-4 overflow-x-auto pb-1">
              {selectableMembers.map((member: any) => {
                const active = selectedMemberId === member.id;
                const label =
                  member.id === ALL_MEMBER_ID
                    ? "All"
                    : member.id === SELF_MEMBER_ID
                    ? member.role
                      ? `You · ${member.role}`
                      : "You"
                    : member.name;

                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className="shrink-0 text-center"
                  >
                    <div
                      className={cn(
                        "mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl transition",
                        active
                          ? "border-emerald-500 bg-white"
                          : isDarkMode
                          ? "border-transparent bg-slate-800"
                          : "border-transparent bg-slate-100"
                      )}
                    >
                      {member.avatar}
                    </div>
                    <div
                      className={cn(
                        "mt-2 text-sm font-medium",
                        active
                          ? "text-emerald-600"
                          : isDarkMode
                          ? "text-slate-400"
                          : "text-slate-500"
                      )}
                    >
                      {label}
                    </div>
                  </button>
                );
              })}

              <button
                onClick={() => setShowInviteSheet(true)}
                className="shrink-0 text-center"
              >
                <div
                  className={cn(
                    "mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed text-3xl",
                    isDarkMode
                      ? "border-slate-700 bg-slate-900 text-slate-300"
                      : "border-slate-300 bg-white text-slate-600"
                  )}
                >
                  +
                </div>
                <div
                  className={cn(
                    "mt-2 text-sm font-medium",
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  Invite
                </div>
              </button>
            </div>
          </section>

          <section className="mb-6">
            <div
              onClick={() => setShowQuickLogSheet(true)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left",
                isDarkMode ? "bg-slate-800" : "bg-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">✏️</span>
                <span className={cn("text-xl", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                  Log a moment...
                </span>
              </div>

              <div className="flex items-center gap-2 text-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickLogWithCategory("sleep");
                  }}
                >
                  😴
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickLogWithCategory("feeding");
                  }}
                >
                  🍼
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickLogWithCategory("mood");
                  }}
                >
                  💛
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickLogWithCategory("note");
                  }}
                >
                  📝
                </button>
              </div>
            </div>
          </section>

          {pinnedEvent ? (
            <section className="mb-6">
              <div
                className={cn(
                  "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                📌 Pinned
              </div>

              <Link
                href="/calendar"
                className={cn(
                  "block rounded-3xl border px-4 py-4",
                  isDarkMode
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-amber-300 bg-amber-50"
                )}
              >
                <div
                  className={cn(
                    "mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                    isDarkMode ? "text-amber-300" : "text-amber-800"
                  )}
                >
                  Important · {pinnedEvent.date === todayKey ? "Today" : "Upcoming"}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="mt-0.5 text-2xl">🏥</div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "truncate text-xl font-semibold",
                          isDarkMode ? "text-amber-100" : "text-amber-950"
                        )}
                      >
                        {pinnedEvent.title}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-sm",
                          isDarkMode ? "text-amber-200" : "text-amber-900"
                        )}
                      >
                        {formatFriendlyDate(pinnedEvent.date, prefs.dateFormat)} ·{" "}
                        {formatDisplayTime(pinnedEvent.time, prefs.timeFormat)}
                      </div>
                    </div>
                  </div>

                  <div className={cn("text-lg", isDarkMode ? "text-amber-300" : "text-amber-700")}>
                    ›
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                Upcoming
              </div>
              <Link href="/calendar" className="text-sm font-medium text-emerald-600">
                See all
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => {
                  const styles = getCategoryStyle(event.category, isDarkMode);

                  const memberNames = event.memberIds.includes(ALL_MEMBER_ID)
                    ? "All members"
                    : familyMembers
                        .filter((member: any) => event.memberIds.includes(member.id))
                        .map((member: any) =>
                          member.id === SELF_MEMBER_ID ? "You" : member.name
                        )
                        .join(", ");

                  return (
                    <Link
                      key={event.id}
                      href={`/calendar?eventId=${encodeURIComponent(event.id)}&date=${encodeURIComponent(event.date)}`}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3",
                        isDarkMode
                          ? "border-slate-800 bg-slate-900"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <span className={cn("h-3 w-3 rounded-full", styles.dot)} />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate text-lg font-medium",
                            isDarkMode ? "text-slate-100" : "text-slate-800"
                          )}
                        >
                          {event.title} {memberNames ? `— ${memberNames}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "text-sm",
                            isDarkMode ? "text-slate-400" : "text-slate-400"
                          )}
                        >
                          {event.allDay
                            ? event.date === todayKey
                              ? "All day"
                              : `${formatFriendlyDate(event.date, prefs.dateFormat)} · All day`
                            : event.date === todayKey
                            ? formatDisplayTime(event.time, prefs.timeFormat)
                            : `${formatFriendlyDate(event.date, prefs.dateFormat)} · ${formatDisplayTime(
                                event.time,
                                prefs.timeFormat
                              )}`}
                        </div>
                      </div>
                    </Link>
                  );
                })
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

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                Moments
              </div>
              <Link href="/journal" className="text-sm font-medium text-emerald-600">
                See all
              </Link>
            </div>

            <div className="space-y-3">
              {topMoments.length > 0 ? (
                topMoments.map((moment: MomentItem) => {
                  const style = getMomentStyle(moment.category, isDarkMode);

                  return (
                    <Link
                      key={moment.id}
                      href="/journal"
                      className={cn(
                        "block rounded-2xl border p-4",
                        isDarkMode
                          ? "border-slate-800 bg-slate-900"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-semibold capitalize",
                            style.badge
                          )}
                        >
                          {moment.category}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            isDarkMode ? "text-slate-500" : "text-slate-400"
                          )}
                        >
                          {moment.createdAt}
                        </span>
                      </div>

                      <div
                        className={cn(
                          "text-base font-semibold",
                          isDarkMode ? "text-slate-100" : "text-slate-800"
                        )}
                      >
                        {moment.emoji} {moment.title}
                      </div>
                      <div
                        className={cn(
                          "mt-1 line-clamp-2 text-sm",
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        )}
                      >
                        {moment.text}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div
                  className={cn(
                    "rounded-2xl border border-dashed px-4 py-6 text-center text-sm",
                    isDarkMode
                      ? "border-slate-700 bg-slate-900 text-slate-400"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  No moments yet
                </div>
              )}
            </div>
          </section>
        </div>

        <BottomTabBar active="home" darkMode={isDarkMode} />

        {showInviteSheet ? (
          <div className="fixed inset-0 z-30 flex items-end bg-black/35">
            <button
              className="absolute inset-0"
              aria-label="Close invite sheet"
              onClick={() => setShowInviteSheet(false)}
            />
            <div
              className={cn(
                "relative w-full max-w-md rounded-t-3xl px-4 pb-6 pt-3 shadow-2xl",
                isDarkMode ? "bg-slate-950" : "bg-white"
              )}
            >
              <div className={cn("mx-auto mb-3 h-1.5 w-12 rounded-full", isDarkMode ? "bg-slate-700" : "bg-slate-200")} />

              <div className="mb-4 flex items-center justify-between">
                <h2 className={cn("text-base font-semibold", isDarkMode ? "text-white" : "text-slate-900")}>
                  Invite to family
                </h2>
                <button
                  onClick={() => setShowInviteSheet(false)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm",
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                  )}
                >
                  Close
                </button>
              </div>

              <div
                className={cn(
                  "rounded-2xl border p-4",
                  isDarkMode
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200 bg-slate-50"
                )}
              >
                <div className={cn("text-sm font-medium", isDarkMode ? "text-slate-100" : "text-slate-800")}>
                  Share this invite link
                </div>
                <div className={cn("mt-2 break-all text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  {mounted ? inviteLink : "Preparing invite link..."}
                </div>
              </div>

              <button
                onClick={copyInviteLink}
                className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                {inviteCopied ? "Copied!" : "Copy invite link"}
              </button>

              <p className={cn("mt-3 text-sm", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                Anyone who registers with this link can be added to the same family.
              </p>
            </div>
          </div>
        ) : null}

        {showQuickLogSheet ? (
          <div className="fixed inset-0 z-30 flex items-end bg-black/35">
            <button
              className="absolute inset-0"
              aria-label="Close quick log sheet"
              onClick={() => setShowQuickLogSheet(false)}
            />

            <div
              className={cn(
                "relative w-full max-w-md rounded-t-[28px] px-4 pb-4 pt-3 shadow-2xl",
                isDarkMode ? "bg-slate-950" : "bg-white"
              )}
            >
              <div className={cn("mx-auto mb-3 h-1.5 w-12 rounded-full", isDarkMode ? "bg-slate-700" : "bg-slate-200")} />

              <div className="mb-4 flex items-center justify-between">
                <h2 className={cn("text-[34px] font-semibold tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  Log a moment
                </h2>
                <button
                  onClick={() => setShowQuickLogSheet(false)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-xl",
                    isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-400"
                  )}
                >
                  ×
                </button>
              </div>

              <div className="mb-3 text-sm text-slate-400">
                For:{" "}
                <span className={cn("font-medium", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                  {selectedMember?.id === ALL_MEMBER_ID
                    ? "You"
                    : selectedMember?.id === SELF_MEMBER_ID
                    ? "You"
                    : selectedMember?.name || "You"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {quickLogOptions.map((item) => {
                  const active = quickLogCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuickLogCategory(item.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border px-4 py-4 text-left text-[18px] font-medium transition",
                        active
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : isDarkMode
                          ? "border-slate-800 bg-slate-900 text-slate-100"
                          : "border-slate-200 bg-white text-slate-800"
                      )}
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <textarea
                value={quickLogText}
                onChange={(e) => setQuickLogText(e.target.value)}
                placeholder={quickLogPlaceholder}
                className={cn(
                  "mt-4 min-h-[120px] w-full resize-none rounded-2xl border px-4 py-4 text-[18px] outline-none placeholder:text-slate-400 focus:border-emerald-400",
                  isDarkMode
                    ? "border-slate-800 bg-slate-900 text-slate-100 focus:bg-slate-900"
                    : "border-slate-200 bg-slate-100 text-slate-800 focus:bg-white"
                )}
              />

              <button
                onClick={handleSaveQuickLog}
                className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-4 text-[18px] font-semibold text-white"
              >
                Save log
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
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
