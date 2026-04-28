"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EventCategory = "health" | "school" | "event" | "finance";
export type Importance = "low" | "normal" | "high";
export type Recurrence =
  | "do-not-repeat"
  | "weekly"
  | "monthly"
  | "annually"
  | "custom";

export type MemberType = "kid" | "pet" | "adult";

export const ALL_MEMBER_ID = "all";
export const SELF_MEMBER_ID = "profile-self";

export type Profile = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  role: string;
  birthday: string;
  passcode: string;
};

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  birthday?: string;
  color?: string;
  type?: MemberType;
};

export type CalendarEvent = {
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
  importance: Importance;
  recurrence: Recurrence;
  recurrenceEndDate?: string;
  recurrenceDays?: string[];
  recurrenceEveryHours?: string;
  reminderMinutes?: string;
  excludedDates?: string[];
};

export type JournalPost = {
  id: string;
  author: string;
  createdAt: string;
  targetMemberIds: string[];
  category: "sleep" | "feeding" | "mood" | "milestone" | "health" | "note";
  visibility: "family" | "private";
  title: string;
  contentStyle?: "paragraph" | "checklist";
  text?: string;
  items?: Array<{ id: string; text: string; checked?: boolean }>;
  likes: string[];
  comments: Array<{
    id: string;
    author: string;
    text: string;
    createdAt: string;
  }>;
  imageUrls: string[];
};
export type HealthRecord = {
  id: string;
  memberId: string;
  date: string;
  category: string;
  metricName: string;
  type: "numeric" | "description";
  value?: number;
  unit?: string;
  description?: string;
  visibility: "private" | "family";
};
export type AppPreferences = {
  showPinnedEvents: boolean;
  displayEventsCount: number;
  categoryDisplay: Record<EventCategory, boolean>;
  themeMode: "system" | "dark";
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY";
  timeFormat: "12h" | "24h";
  weekStartDay: "Sunday" | "Monday";
  doNotDisturbMode: "system" | "custom";
  dndStartTime: string;
  dndEndTime: string;
  shareDataWithDeveloper: boolean;
};

type NestliStore = {
  isAuthenticated: boolean;

  profile: Profile;
  familyMembers: FamilyMember[];
  events: CalendarEvent[];
  journalPosts: JournalPost[];
  appPreferences: AppPreferences;

  updateProfile: (updates: Partial<Profile>) => void;

  addFamilyMember: (
    member: Omit<FamilyMember, "id" | "color"> & { color?: string }
  ) => string;
  updateFamilyMember: (
    memberId: string,
    updates: Partial<FamilyMember>
  ) => void;
  deleteFamilyMember: (memberId: string) => void;

  updatePasscode: (payload: {
    currentPasscode: string;
    newPasscode: string;
  }) => boolean;

  updateAppPreferences: (updates: Partial<AppPreferences>) => void;

  logout: () => void;
  deleteAccount: () => void;

  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (baseEventId: string) => void;
  deleteEventOccurrence: (baseEventId: string, occurrenceDate: string) => void;

  getEventsForDate: (
    date: string,
    memberId?: string,
    category?: "all" | EventCategory,
    searchTerm?: string
  ) => CalendarEvent[];

  getUpcomingEvents: (
    fromDate: string,
    memberId?: string,
    limit?: number
  ) => CalendarEvent[];

  getPinnedEvents: (fromDate: string, memberId?: string) => CalendarEvent[];

  addJournalPost: (post: JournalPost) => void;

  deleteJournalPost: (postId: string) => void;
  updateJournalPost: (post: JournalPost) => void;

  healthRecords: HealthRecord[];

  addHealthRecord: (record: HealthRecord) => void;
  updateHealthRecord: (record: HealthRecord) => void;
  deleteHealthRecord: (recordId: string) => void;
};


const MEMBER_COLORS = [
  "bg-rose-100",
  "bg-amber-100",
  "bg-emerald-100",
  "bg-sky-100",
  "bg-violet-100",
  "bg-pink-100",
];

const defaultProfile: Profile = {
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  phone: "",
  role: "",
  birthday: "",
  passcode: "",
};

function buildSelfMember(profile: Profile): FamilyMember {
  return {
    id: SELF_MEMBER_ID,
    name: profile.displayName?.trim() || profile.firstName?.trim() || "You",
    role: profile.role?.trim() || "Family",
    avatar: "👩",
    birthday: profile.birthday || "",
    color: "bg-emerald-100",
    type: "adult",
  };
}

function buildAllMember(): FamilyMember {
  return {
    id: ALL_MEMBER_ID,
    name: "All members",
    role: "Family",
    avatar: "🏠",
    color: "bg-slate-100",
    type: "adult",
  };
}

function normalizeFamilyMembers(
  profile: Profile,
  familyMembers: FamilyMember[] = []
): FamilyMember[] {
  const allMember = buildAllMember();
  const selfMember = buildSelfMember(profile);

  const others = (familyMembers || []).filter(
    (member) => member.id !== ALL_MEMBER_ID && member.id !== SELF_MEMBER_ID
  );

  return [allMember, selfMember, ...others];
}
const defaultFamilyMembers: FamilyMember[] = normalizeFamilyMembers(defaultProfile, []);
function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  occurrence: number
) {
  const first = new Date(year, monthIndex, 1);
  const shift = (7 + weekday - first.getDay()) % 7;
  return new Date(year, monthIndex, 1 + shift + (occurrence - 1) * 7);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number) {
  const lastDay = new Date(year, monthIndex + 1, 0);
  const shift = (7 + lastDay.getDay() - weekday) % 7;
  return new Date(year, monthIndex, lastDay.getDate() - shift);
}

function buildUSFederalHolidayEvents(year: number): CalendarEvent[] {
  const holidayDefs = [
    { title: "New Year's Day", date: new Date(year, 0, 1) },
    { title: "Martin Luther King Jr. Day", date: nthWeekdayOfMonth(year, 0, 1, 3) },
    { title: "Washington's Birthday", date: nthWeekdayOfMonth(year, 1, 1, 3) },
    { title: "Memorial Day", date: lastWeekdayOfMonth(year, 4, 1) },
    { title: "Juneteenth National Independence Day", date: new Date(year, 5, 19) },
    { title: "Independence Day", date: new Date(year, 6, 4) },
    { title: "Labor Day", date: nthWeekdayOfMonth(year, 8, 1, 1) },
    { title: "Columbus Day", date: nthWeekdayOfMonth(year, 9, 1, 2) },
    { title: "Veterans Day", date: new Date(year, 10, 11) },
    { title: "Thanksgiving Day", date: nthWeekdayOfMonth(year, 10, 4, 4) },
    { title: "Christmas Day", date: new Date(year, 11, 25) },
  ];

  return holidayDefs.map((holiday) => {
    const y = holiday.date.getFullYear();
    const m = String(holiday.date.getMonth() + 1).padStart(2, "0");
    const d = String(holiday.date.getDate()).padStart(2, "0");
    return {
      id: `us-fed-${y}-${m}-${d}`,
      title: holiday.title,
      date: `${y}-${m}-${d}`,
      time: "00:00",
      allDay: true,
      durationMinutes: 1440,
      category: "event" as const,
      memberIds: [ALL_MEMBER_ID],
      notes: "US federal holiday.",
      pinned: false,
      importance: "normal" as const,
      recurrence: "do-not-repeat" as const,
      reminderMinutes: "1440",
    };
  });
}

function withFederalHolidays(baseEvents: CalendarEvent[] = []) {
  const currentYear = new Date().getFullYear();
  const holidayEvents = [
    ...buildUSFederalHolidayEvents(currentYear),
    ...buildUSFederalHolidayEvents(currentYear + 1),
  ];
  const map = new Map<string, CalendarEvent>();
  [...holidayEvents, ...baseEvents].forEach((event) => {
    map.set(event.id, event);
  });
  return Array.from(map.values());
}

const defaultEvents: CalendarEvent[] = withFederalHolidays([]);

const defaultJournalPosts: JournalPost[] = [
];

const defaultHealthRecords: HealthRecord[] = [];

const defaultAppPreferences: AppPreferences = {
  showPinnedEvents: true,
  displayEventsCount: 3,
  categoryDisplay: {
    health: true,
    school: true,
    event: true,
    finance: true,
  },
  themeMode: "system",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  weekStartDay: "Sunday",
  doNotDisturbMode: "system",
  dndStartTime: "21:00",
  dndEndTime: "07:00",
  shareDataWithDeveloper: true,
};

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function compareEventDateTime(a: CalendarEvent, b: CalendarEvent) {
  const aKey = `${a.date}T${a.time || "00:00"}`;
  const bKey = `${b.date}T${b.time || "00:00"}`;
  return aKey.localeCompare(bKey);
}

function includesMember(
  eventMemberIds: string[],
  selectedMemberId?: string
): boolean {
  if (!selectedMemberId || selectedMemberId === ALL_MEMBER_ID) return true;
  if (eventMemberIds.includes(ALL_MEMBER_ID)) return true;
  return eventMemberIds.includes(selectedMemberId);
}

function matchesCategory(
  event: CalendarEvent,
  category?: "all" | EventCategory
) {
  if (!category || category === "all") return true;
  return event.category === category;
}

function matchesSearch(event: CalendarEvent, searchTerm?: string) {
  if (!searchTerm?.trim()) return true;
  const q = searchTerm.trim().toLowerCase();
  return [
    event.title,
    event.notes || "",
    event.location || "",
    event.category,
    event.time,
    event.date,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function recurrenceIncludesDate(event: CalendarEvent, targetDate: string) {
  const baseDate = parseDate(event.date);
  const currentDate = parseDate(targetDate);

  if (currentDate.getTime() < baseDate.getTime()) return false;
  if (event.excludedDates?.includes(targetDate)) return false;

  if (
    event.recurrenceEndDate &&
    currentDate.getTime() > parseDate(event.recurrenceEndDate).getTime()
  ) {
    return false;
  }

  switch (event.recurrence) {
    case "do-not-repeat":
      return targetDate === event.date;

    case "weekly":
      return currentDate.getDay() === baseDate.getDay();

    case "monthly":
      return currentDate.getDate() === baseDate.getDate();

    case "annually":
      return (
        currentDate.getDate() === baseDate.getDate() &&
        currentDate.getMonth() === baseDate.getMonth()
      );

    case "custom": {
      if (event.recurrenceDays && event.recurrenceDays.length > 0) {
        const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return event.recurrenceDays.includes(weekdayNames[currentDate.getDay()]);
      }

      if (event.recurrenceEveryHours) {
        const everyHours = Number(event.recurrenceEveryHours);
        if (!Number.isFinite(everyHours) || everyHours <= 0) return false;

        const diffMs = currentDate.getTime() - baseDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= 0 && Math.floor(diffHours) % everyHours === 0;
      }

      return false;
    }

    default:
      return false;
  }
}

function expandEventForDate(
  event: CalendarEvent,
  targetDate: string
): CalendarEvent | null {
  if (!recurrenceIncludesDate(event, targetDate)) return null;

  if (event.recurrence === "do-not-repeat") {
    return { ...event };
  }

  return {
    ...event,
    id: `${event.id}_${targetDate}`,
    date: targetDate,
  };
}

function getColorForIndex(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

function buildInitialState() {
  return {
    isAuthenticated: true,
    profile: defaultProfile,
    familyMembers: defaultFamilyMembers,
    events: defaultEvents,
    journalPosts: defaultJournalPosts,
    healthRecords: defaultHealthRecords,
    appPreferences: defaultAppPreferences,
  };
}

export const useNestliStore = create<NestliStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),

      updateProfile: (updates) => {
        set((state) => {
          const nextProfile = {
            ...state.profile,
            ...updates,
          };

          return {
            profile: nextProfile,
            familyMembers: normalizeFamilyMembers(nextProfile, state.familyMembers),
          };
        });
      },

      addFamilyMember: (member) => {
        const existingMembers = get().familyMembers.filter(
          (m) => m.id !== ALL_MEMBER_ID && m.id !== SELF_MEMBER_ID
        );

        const id =
          member.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") +
          "-" +
          Date.now().toString().slice(-5);

        const newMember: FamilyMember = {
          id,
          name: member.name,
          role: member.role,
          avatar: member.avatar,
          birthday: member.birthday,
          type: member.type,
          color: member.color || getColorForIndex(existingMembers.length),
        };

        set((state) => ({
          familyMembers: normalizeFamilyMembers(state.profile, [
            ...state.familyMembers,
            newMember,
          ]),
        }));

        return id;
      },

      updateFamilyMember: (memberId, updates) => {
        if (memberId === ALL_MEMBER_ID || memberId === SELF_MEMBER_ID) return;

        set((state) => ({
          familyMembers: normalizeFamilyMembers(
            state.profile,
            state.familyMembers.map((member) =>
              member.id === memberId ? { ...member, ...updates } : member
            )
          ),
        }));
      },

      deleteFamilyMember: (memberId) => {
        if (memberId === ALL_MEMBER_ID || memberId === SELF_MEMBER_ID) return;

        set((state) => ({
          familyMembers: normalizeFamilyMembers(
            state.profile,
            state.familyMembers.filter((member) => member.id !== memberId)
          ),
          events: state.events.map((event) => {
            const nextMemberIds = event.memberIds.filter((id) => id !== memberId);
            return {
              ...event,
              memberIds: nextMemberIds.length > 0 ? nextMemberIds : [ALL_MEMBER_ID],
            };
          }),
          journalPosts: state.journalPosts.map((post) => {
            const nextTargetIds = post.targetMemberIds.filter((id) => id !== memberId);
            return {
              ...post,
              targetMemberIds: nextTargetIds.length > 0 ? nextTargetIds : [ALL_MEMBER_ID],
            };
          }),
        }));
      },

      updatePasscode: ({ currentPasscode, newPasscode }) => {
        const currentStoredPasscode = get().profile.passcode || "";

        if (currentStoredPasscode && currentStoredPasscode !== currentPasscode) {
          return false;
        }

        set((state) => ({
          profile: {
            ...state.profile,
            passcode: newPasscode,
          },
        }));

        return true;
      },

      updateAppPreferences: (updates) => {
        set((state) => ({
          appPreferences: {
            ...state.appPreferences,
            ...updates,
            categoryDisplay: {
              ...state.appPreferences.categoryDisplay,
              ...(updates.categoryDisplay || {}),
            },
          },
        }));
      },

      logout: () => {
        set(() => ({
          isAuthenticated: false,
        }));
      },

      deleteAccount: () => {
        const blankProfile = {
          ...defaultProfile,
          displayName: "",
          email: "",
          birthday: "",
          role: "",
          passcode: "",
        };

        set(() => ({
          ...buildInitialState(),
          isAuthenticated: false,
          profile: blankProfile,
          familyMembers: normalizeFamilyMembers(blankProfile, []),
          events: [],
          journalPosts: [],
          healthRecords: [],
        }));
      },
      addHealthRecord: (record) => {
        set((state) => ({
          healthRecords: [record, ...state.healthRecords],
        }));
      },

      updateHealthRecord: (record) => {
        set((state) => ({
          healthRecords: state.healthRecords.map((item) =>
            item.id === record.id ? record : item
          ),
        }));
      },

      deleteHealthRecord: (recordId) => {
        set((state) => ({
          healthRecords: state.healthRecords.filter((item) => item.id !== recordId),
        }));
      },

      addEvent: (event) => {
        set((state) => {
          const existingIndex = state.events.findIndex((item) => item.id === event.id);

          if (existingIndex >= 0) {
            const nextEvents = [...state.events];
            nextEvents[existingIndex] = event;
            return { events: nextEvents };
          }

          return {
            events: [...state.events, event],
          };
        });
      },

      updateEvent: (event) => {
        set((state) => ({
          events: state.events.map((item) => (item.id === event.id ? event : item)),
        }));
      },

      deleteEvent: (baseEventId) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== baseEventId),
        }));
      },
      
      deleteEventOccurrence: (baseEventId, occurrenceDate) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === baseEventId
              ? {
                  ...event,
                  excludedDates: Array.from(
                    new Set([...(event.excludedDates || []), occurrenceDate])
                  ),
                }
              : event
          ),
        }));
      },

      getEventsForDate: (date, memberId = ALL_MEMBER_ID, category = "all", searchTerm = "") => {
        const { events, appPreferences } = get();

        return events
          .map((event) => expandEventForDate(event, date))
          .filter((event): event is CalendarEvent => Boolean(event))
          .filter((event) => includesMember(event.memberIds, memberId))
          .filter((event) => matchesCategory(event, category))
          .filter((event) => matchesSearch(event, searchTerm))
          .filter((event) => appPreferences.categoryDisplay[event.category] !== false)
          .sort(compareEventDateTime);
      },

      getUpcomingEvents: (fromDate, memberId = ALL_MEMBER_ID, limit = 5) => {
        const { events, appPreferences } = get();
        const results: CalendarEvent[] = [];
        const seen = new Set<string>();
        const start = parseDate(fromDate);

        for (let offset = 0; offset < 366 && results.length < limit; offset += 1) {
          const current = new Date(start);
          current.setDate(start.getDate() + offset);
          const dateKey = formatDateKey(current);

          const dayEvents = events
            .map((event) => expandEventForDate(event, dateKey))
            .filter((event): event is CalendarEvent => Boolean(event))
            .filter((event) => includesMember(event.memberIds, memberId))
            .filter((event) => appPreferences.categoryDisplay[event.category] !== false)
            .sort(compareEventDateTime);

          for (const event of dayEvents) {
            const uniqueKey = `${event.id}-${event.date}-${event.time}`;
            if (!seen.has(uniqueKey)) {
              seen.add(uniqueKey);
              results.push(event);
            }
            if (results.length >= limit) break;
          }
        }

        return results;
      },

      getPinnedEvents: (fromDate, memberId = ALL_MEMBER_ID) => {
        const { events, appPreferences } = get();

        if (!appPreferences.showPinnedEvents) return [];

        const results: CalendarEvent[] = [];
        const start = parseDate(fromDate);

        for (let offset = 0; offset < 366; offset += 1) {
          const current = new Date(start);
          current.setDate(start.getDate() + offset);
          const dateKey = formatDateKey(current);

          const dayPinned = events
            .map((event) => expandEventForDate(event, dateKey))
            .filter((event): event is CalendarEvent => Boolean(event))
            .filter((event) => Boolean(event.pinned))
            .filter((event) => includesMember(event.memberIds, memberId))
            .filter((event) => appPreferences.categoryDisplay[event.category] !== false)
            .sort(compareEventDateTime);

          results.push(...dayPinned);
        }

        return results.sort(compareEventDateTime);
      },

      addJournalPost: (post) => {
        set((state) => ({
          journalPosts: [post, ...state.journalPosts],
        }));
      },
      updateJournalPost: (post) => {
        set((state) => ({
          journalPosts: state.journalPosts.map((item) =>
            item.id === post.id ? post : item
          ),
        }));
      },

      deleteJournalPost: (postId) => {
        set((state) => ({
          journalPosts: state.journalPosts.filter((post) => post.id !== postId),
        }));
      },
    }),
    {
      name: "nestli-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        profile: state.profile,
        familyMembers: state.familyMembers,
        events: state.events,
        journalPosts: state.journalPosts,
        healthRecords: state.healthRecords,
        appPreferences: state.appPreferences,
      }),
      merge: (persistedState, currentState) => {
        const typedPersisted = (persistedState || {}) as Partial<NestliStore>;
        const typedCurrent = currentState as NestliStore;

        const mergedProfile = {
          ...typedCurrent.profile,
          ...(typedPersisted.profile || {}),
        };

        const mergedFamilyMembers = normalizeFamilyMembers(
          mergedProfile,
          typedPersisted.familyMembers || typedCurrent.familyMembers || []
        );

        return {
          ...typedCurrent,
          ...typedPersisted,
          profile: mergedProfile,
          familyMembers: mergedFamilyMembers,
          events: withFederalHolidays(typedPersisted.events || typedCurrent.events),
          journalPosts: typedPersisted.journalPosts || typedCurrent.journalPosts,
          healthRecords: typedPersisted.healthRecords || typedCurrent.healthRecords,
          appPreferences: {
            ...typedCurrent.appPreferences,
            ...(typedPersisted.appPreferences || {}),
            categoryDisplay: {
              ...typedCurrent.appPreferences.categoryDisplay,
              ...(typedPersisted.appPreferences?.categoryDisplay || {}),
            },
          },
        };
      },
    }
  )
);
