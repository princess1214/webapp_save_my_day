"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SELF_MEMBER_ID, useAssistMyDayStore } from "../../lib/assistmyday-store";

type EventCategory = "health" | "school" | "event" | "finance";
type Screen =
  | "main"
  | "account"
  | "notifications"
  | "notification-categories"
  | "preferences";

type MemberType = "kid" | "pet" | "adult";

type FamilyMemberLike = {
  id: string;
  name: string;
  role?: string;
  avatar: string;
  birthday?: string;
  color?: string;
  type?: MemberType;
  userId?: string;
  familyId?: string;
};

type RoleOption = "Mom" | "Dad" | "Grandparent" | "Caregiver" | "Guardian" | "Custom";

const ACCOUNT_ROLE_OPTIONS: RoleOption[] = [
  "Mom",
  "Dad",
  "Grandparent",
  "Caregiver",
  "Guardian",
  "Custom",
];

const MEMBER_TYPE_OPTIONS: Array<{ value: MemberType; label: string }> = [
  { value: "kid", label: "Kid" },
  { value: "pet", label: "Pet" },
  { value: "adult", label: "Adult" },
];

const MEMBER_AVATARS = [
  "👶",
  "👧",
  "👦",
  "🧒",
  "👩",
  "👨",
  "👵",
  "👴",
  "🐶",
  "🐱",
  "🐰",
  "🐹",
];

const CATEGORY_LABELS: Record<EventCategory, string> = {
  health: "Health",
  school: "School",
  event: "Event",
  finance: "Finance",
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isPredefinedRole(value: string) {
  return ACCOUNT_ROLE_OPTIONS.includes(value as RoleOption) && value !== "Custom";
}

function formatBirthdayTitle(name: string) {
  return `${name}'s Birthday`;
}

function getBirthdayEventIdForProfile() {
  return "birthday-profile-self";
}

function getBirthdayEventIdForMember(memberId: string) {
  return `birthday-member-${memberId}`;
}

function normalizeDate(date: string) {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return date;
}

export default function ProfilePage() {
  const store = useAssistMyDayStore() as any;

  const {
    profile,
    updateProfile,
    familyMembers,
    addFamilyMember,
    deleteFamilyMember,
    events = [],
    addEvent,
  } = store;

  const updateFamilyMember = store.updateFamilyMember;
  const updatePasscode = store.updatePasscode;
  const updateAppPreferences = store.updateAppPreferences;
  const logout = store.logout;
  const deleteAccount = store.deleteAccount;
  const updateEvent = store.updateEvent;

  const appPreferences = store.appPreferences || {};

  const actualFamilyMembers = useMemo(() => {
    return (familyMembers || []).filter((member: FamilyMemberLike) => member.id !== "all");
  }, [familyMembers]);

  const initialRoleValue = profile?.role || "Mom";
  const initialRoleSelection: RoleOption = isPredefinedRole(initialRoleValue)
    ? (initialRoleValue as RoleOption)
    : "Custom";

  const [screen, setScreen] = useState<Screen>("main");
  const [mounted, setMounted] = useState(false);

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [birthday, setBirthday] = useState(profile?.birthday || "");
  const [roleSelection, setRoleSelection] = useState<RoleOption>(initialRoleSelection);
  const [customRole, setCustomRole] = useState(
    initialRoleSelection === "Custom" ? initialRoleValue : ""
  );

  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  const [showMemberSheet, setShowMemberSheet] = useState(false);
  const [memberSheetMode, setMemberSheetMode] = useState<"add" | "edit">("add");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("kid");
  const [memberRole, setMemberRole] = useState("Child");
  const [memberBirthday, setMemberBirthday] = useState("");
  const [memberAvatar, setMemberAvatar] = useState("👶");
  const [showDeleteMemberConfirm, setShowDeleteMemberConfirm] = useState(false);
  const [showDeleteLinkedMemberConfirm, setShowDeleteLinkedMemberConfirm] = useState(false);
  const [pendingDeleteMemberId, setPendingDeleteMemberId] = useState<string | null>(null);

  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [familyId, setFamilyId] = useState("");

  const [showPinnedEvents, setShowPinnedEvents] = useState(
    appPreferences.showPinnedEvents ?? true
  );
  const [displayEventsCount, setDisplayEventsCount] = useState(
    appPreferences.displayEventsCount ?? 3
  );
  const [categoryDisplay, setCategoryDisplay] = useState<Record<EventCategory, boolean>>(
    appPreferences.categoryDisplay ?? {
      health: true,
      school: true,
      event: true,
      finance: true,
    }
  );

  const [themeMode, setThemeMode] = useState<"system" | "dark">(
    appPreferences.themeMode ?? "system"
  );
  const [dateFormat, setDateFormat] = useState<"MM/DD/YYYY" | "DD/MM/YYYY">(
    appPreferences.dateFormat ?? "MM/DD/YYYY"
  );
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(
    appPreferences.timeFormat ?? "12h"
  );
  const [weekStartDay, setWeekStartDay] = useState<"Sunday" | "Monday">(
    appPreferences.weekStartDay ?? "Sunday"
  );
  const [doNotDisturbMode, setDoNotDisturbMode] = useState<"system" | "custom">(
    appPreferences.doNotDisturbMode ?? "system"
  );
  const [dndStartTime, setDndStartTime] = useState(appPreferences.dndStartTime ?? "21:00");
  const [dndEndTime, setDndEndTime] = useState(appPreferences.dndEndTime ?? "07:00");
  const [shareDataWithDeveloper, setShareDataWithDeveloper] = useState(
    appPreferences.shareDataWithDeveloper ?? false
  );
  const [temperatureUnit, setTemperatureUnit] = useState<"C" | "F">(
    appPreferences.temperatureUnit ?? "C"
  );

  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setAccountId(
        localStorage.getItem("assistmyday_account_id") ||
          localStorage.getItem("assistmyday_account_number") ||
          ""
      );
      setFamilyId(
        localStorage.getItem("assistmyday_family_id") ||
          localStorage.getItem("assistmyday_account_number") ||
          ""
      );
    }
  }, []);

  useEffect(() => {
    const roleValue = profile?.role || "Mom";
    const nextSelection: RoleOption = isPredefinedRole(roleValue)
      ? (roleValue as RoleOption)
      : "Custom";

    setDisplayName(profile?.displayName || "");
    setEmail(profile?.email || "");
    setBirthday(profile?.birthday || "");
    setRoleSelection(nextSelection);
    setCustomRole(nextSelection === "Custom" ? roleValue : "");
  }, [profile]);

  useEffect(() => {
    if (!mounted) return;
    const origin = window.location.origin;
    const inviter = encodeURIComponent(displayName || "Family Organizer");
    const activeFamilyId = encodeURIComponent(
      familyId ||
        localStorage.getItem("assistmyday_family_id") ||
        localStorage.getItem("assistmyday_account_number") ||
        ""
    );
    setInviteLink(`${origin}/?invite=1&inviter=${inviter}&familyId=${activeFamilyId}`);
  }, [mounted, displayName, familyId]);

  function flashSaved(message = "Saved") {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(""), 1800);
  }

  function resolveAccountRole() {
    return roleSelection === "Custom" ? customRole.trim() : roleSelection;
  }

  function upsertBirthdayEvent(params: {
    eventId: string;
    title: string;
    date: string;
    memberIds: string[];
  }) {
    const safeDate = normalizeDate(params.date);
    if (!safeDate || !addEvent) return;

    const existing = (events || []).find((event: any) => event.id === params.eventId);

    const birthdayEvent = {
      id: params.eventId,
      title: params.title,
      date: safeDate,
      time: "09:00",
      durationMinutes: 60,
      category: "event" as EventCategory,
      memberIds: params.memberIds,
      notes: "Birthday reminder",
      location: "",
      pinned: false,
      importance: "normal",
      recurrence: "annually",
      recurrenceEndDate: "",
      recurrenceDays: [],
      recurrenceEveryHours: "",
      reminderMinutes: "1440",
    };

    if (existing && typeof updateEvent === "function") {
      updateEvent(birthdayEvent);
      return;
    }

    if (!existing) {
      addEvent(birthdayEvent);
    }
  }

  function handleSaveAccount() {
    const resolvedRole = resolveAccountRole();

    if (!displayName.trim()) {
      setSaveMessage("Please enter a name");
      return;
    }

    if (roleSelection === "Custom" && !customRole.trim()) {
      setSaveMessage("Please enter your custom role");
      return;
    }

    updateProfile?.({
      displayName: displayName.trim(),
      email: email.trim(),
      birthday,
      role: resolvedRole,
      phone: "",
    });

    if (birthday) {
      upsertBirthdayEvent({
        eventId: getBirthdayEventIdForProfile(),
        title: formatBirthdayTitle(displayName.trim() || "My"),
        date: birthday,
        memberIds: ["all"],
      });
    }

    if (newPasscode || confirmPasscode || currentPasscode) {
      if (newPasscode !== confirmPasscode) {
        setSaveMessage("New passcode does not match confirmation");
        return;
      }

      if (newPasscode.length > 0 && newPasscode.length < 4) {
        setSaveMessage("Passcode should be at least 4 characters");
        return;
      }

      if (typeof updatePasscode === "function") {
        updatePasscode({
          currentPasscode,
          newPasscode,
        });
      }
    }

    setCurrentPasscode("");
    setNewPasscode("");
    setConfirmPasscode("");
    flashSaved("Account updated");
  }

  function openAddMember() {
    setMemberSheetMode("add");
    setEditingMemberId(null);
    setMemberName("");
    setMemberType("kid");
    setMemberRole("Child");
    setMemberBirthday("");
    setMemberAvatar("👶");
    setShowMemberSheet(true);
  }

  function openEditMember(member: FamilyMemberLike) {
    setMemberSheetMode("edit");
    setEditingMemberId(member.id);
    setMemberName(member.name || "");
    setMemberType(member.type || inferMemberType(member));
    setMemberRole(member.role || "Child");
    setMemberBirthday(member.birthday || "");
    setMemberAvatar(member.avatar || "👶");
    setShowMemberSheet(true);
  }

  function inferMemberType(member: FamilyMemberLike): MemberType {
    const value = (member.role || "").toLowerCase();
    if (value.includes("pet") || value.includes("dog") || value.includes("cat")) return "pet";
    if (
      value.includes("mom") ||
      value.includes("dad") ||
      value.includes("grand") ||
      value.includes("caregiver") ||
      value.includes("guardian")
    ) {
      return "adult";
    }
    return "kid";
  }

  function handleSaveMember() {
    if (!memberName.trim()) {
      setSaveMessage("Please enter a family member name");
      return;
    }

    const payload = {
      name: memberName.trim(),
      role: memberRole.trim() || (memberType === "pet" ? "Pet" : "Child"),
      avatar: memberAvatar,
      birthday: memberBirthday || "",
      type: memberType,
    };

    if (memberSheetMode === "edit" && editingMemberId) {
      if (typeof updateFamilyMember === "function") {
        updateFamilyMember(editingMemberId, payload);
      }

      if (memberBirthday) {
        upsertBirthdayEvent({
          eventId: getBirthdayEventIdForMember(editingMemberId),
          title: formatBirthdayTitle(memberName.trim()),
          date: memberBirthday,
          memberIds: [editingMemberId],
        });
      }

      flashSaved("Family member updated");
    } else {
      addFamilyMember?.(payload);

      const addedMember =
        actualFamilyMembers.find(
          (m: FamilyMemberLike) =>
            m.name === memberName.trim() &&
            m.role === payload.role &&
            m.avatar === payload.avatar
        ) || null;

      const newMemberId = addedMember?.id;

      if (memberBirthday && newMemberId) {
        upsertBirthdayEvent({
          eventId: getBirthdayEventIdForMember(newMemberId),
          title: formatBirthdayTitle(memberName.trim()),
          date: memberBirthday,
          memberIds: [newMemberId],
        });
      }

      flashSaved("Family member added");
    }

    setShowMemberSheet(false);
  }

  function requestDeleteMember(memberId: string) {
    if (memberId === SELF_MEMBER_ID) {
      setSaveMessage("Primary user cannot be deleted.");
      return;
    }
    const member = actualFamilyMembers.find((item: FamilyMemberLike) => item.id === memberId);
    const activeFamilyId =
      familyId ||
      (typeof window !== "undefined" ? localStorage.getItem("assistmyday_family_id") : "") ||
      "";
    const activeAccountId =
      accountId ||
      (typeof window !== "undefined"
        ? localStorage.getItem("assistmyday_account_id") ||
          localStorage.getItem("assistmyday_account_number")
        : "") ||
      "";
    const isLinkedFamilyUser =
      Boolean(member?.familyId) &&
      Boolean(member?.userId) &&
      member?.familyId === activeFamilyId &&
      member?.userId !== activeAccountId;

    setPendingDeleteMemberId(memberId);
    if (isLinkedFamilyUser) {
      setShowDeleteLinkedMemberConfirm(true);
      return;
    }
    setShowDeleteMemberConfirm(true);
  }

  function confirmDeleteMember() {
    if (!pendingDeleteMemberId) return;
    deleteFamilyMember?.(pendingDeleteMemberId);
    setPendingDeleteMemberId(null);
    setShowDeleteMemberConfirm(false);
    setShowDeleteLinkedMemberConfirm(false);
    flashSaved("Family member deleted");
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

  function saveNotifications() {
    if (typeof updateAppPreferences === "function") {
      updateAppPreferences({
        showPinnedEvents,
        displayEventsCount,
        categoryDisplay,
      });
    }
    flashSaved("Notification settings updated");
  }

  function savePreferences() {
    if (typeof updateAppPreferences === "function") {
      updateAppPreferences({
        themeMode,
        dateFormat,
        timeFormat,
        weekStartDay,
        doNotDisturbMode,
        dndStartTime,
        dndEndTime,
        shareDataWithDeveloper,
        temperatureUnit,
      });
    }
    flashSaved("Preferences updated");
  }

  function renderHeader(title: string, canGoBack = false) {
    return (
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {canGoBack ? (
            <button
              onClick={() => {
                if (screen === "notification-categories") {
                  setScreen("notifications");
                } else {
                  setScreen("main");
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
            >
              ←
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              AssistMyDay
            </p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>

          {saveMessage ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {saveMessage}
            </span>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="app-themed mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm dark:bg-slate-900">
        {screen === "main" && renderHeader("Profile")}
        {screen === "account" && renderHeader("Account", true)}
        {screen === "notifications" && renderHeader("Notification", true)}
        {screen === "notification-categories" && renderHeader("Notify by category", true)}
        {screen === "preferences" && renderHeader("User preference", true)}

        <div className="flex-1 px-4 pb-24 pt-4">
          {screen === "main" ? (
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-800">
                    {(displayName || "NA").slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold">{displayName || "Your profile"}</div>
                    <div className="truncate text-sm text-slate-500">
                      {email || "No email added"}
                    </div>
                    <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                      {resolveAccountRole() || "Family"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Account ID: {accountId || "Not assigned"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Family ID: {familyId || "Not assigned"}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">you can send issue/failure reports to the developer</p>
                <Link href="/report-issue" className="inline-block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Report an issue</Link>
              </section>

              <section className="space-y-3">
                <button
                  onClick={() => setScreen("account")}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Account</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Update name, email, birthday, role, passcode, logout, or delete account
                    </div>
                  </div>
                  <span className="text-xl text-slate-400">›</span>
                </button>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Family members</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Add kids or pets, edit their details, or invite a new member
                      </div>
                    </div>

                    <button
                      onClick={openAddMember}
                      className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-3">
                    {actualFamilyMembers.map((member: FamilyMemberLike) => {
                      const canDelete = member.id !== SELF_MEMBER_ID;
                      return (
                      <div key={member.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-full text-xl",
                                member.color || "bg-white"
                              )}
                            >
                              {member.avatar}
                            </div>

                            <div>
                              <div className="text-sm font-semibold text-slate-800">
                                {member.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                {member.role || "Family"}
                                {member.birthday ? ` · ${member.birthday}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditMember(member)}
                              className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => requestDeleteMember(member.id)}
                              disabled={!canDelete}
                              className={cn(
                                "rounded-full px-3 py-2 text-sm font-medium",
                                canDelete
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-100 text-slate-400"
                              )}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-800">Invite new member</div>
                    <div className="mt-2 break-all text-sm text-slate-500">
                      {mounted ? inviteLink : "Preparing invite link..."}
                    </div>

                    <button
                      onClick={copyInviteLink}
                      className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                    >
                      {inviteCopied ? "Copied!" : "Copy invite link"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setScreen("notifications")}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Notification</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Pinned events, display count, and category visibility on Home
                    </div>
                  </div>
                  <span className="text-xl text-slate-400">›</span>
                </button>

                <button
                  onClick={() => setScreen("preferences")}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-800">User preference</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Theme, date/time format, calendar week start, and do not disturb
                    </div>
                  </div>
                  <span className="text-xl text-slate-400">›</span>
                </button>
              </section>

              <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Data privacy</div>
                <p className="mt-2 text-sm text-slate-600">
                  Your family data is never shared or used for advertising. It is only used to
                  support app features and future app development.
                </p>

                <div className="mt-4 space-y-3">
                  <ToggleRow
                    title="Allow failure reports to developer"
                    subtitle="When on, you can send issue/failure reports from the Report issue page"
                    checked={shareDataWithDeveloper}
                    onChange={(value) => {
                      setShareDataWithDeveloper(value);
                      if (typeof updateAppPreferences === "function") {
                        updateAppPreferences({ shareDataWithDeveloper: value });
                      }
                      flashSaved("Privacy choice updated");
                    }}
                  />
                  <Link href="/report-issue" className="inline-block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Report an issue</Link>
                  <p className="text-sm text-slate-600">you can send issue/failure reports to the developer</p>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Legal & support</div>
                <Link
                  href="/terms"
                  className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  Privacy Policy
                </Link>
              </section>
            </div>
          ) : null}

          {screen === "account" ? (
            <div className="space-y-6">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <Field label="Name">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                    placeholder="Emily"
                  />
                </Field>

                <Field label="Email">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Birthday">
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Role in the family">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {ACCOUNT_ROLE_OPTIONS.map((item) => (
                        <button
                          key={item}
                          onClick={() => setRoleSelection(item)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-sm transition",
                            roleSelection === item
                              ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    {roleSelection === "Custom" ? (
                      <input
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        className={inputClass}
                        placeholder="Enter your custom role"
                      />
                    ) : null}
                  </div>
                </Field>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-800">Change passcode</div>

                <Field label="Current passcode">
                  <input
                    type="password"
                    value={currentPasscode}
                    onChange={(e) => setCurrentPasscode(e.target.value)}
                    className={inputClass}
                    placeholder="Current passcode"
                  />
                </Field>

                <Field label="New passcode">
                  <input
                    type="password"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className={inputClass}
                    placeholder="New passcode"
                  />
                </Field>

                <Field label="Confirm new passcode">
                  <input
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    className={inputClass}
                    placeholder="Confirm new passcode"
                  />
                </Field>
              </section>

              <button
                onClick={handleSaveAccount}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Save account
              </button>

              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-800"
                >
                  Logout
                </button>

                <button
                  onClick={() => setShowDeleteAccountConfirm(true)}
                  className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Delete account
                </button>
              </section>
            </div>
          ) : null}

          {screen === "notifications" ? (
            <div className="space-y-4">
              <ToggleRow
                title="Show pinned events"
                subtitle="When on, the pinned event card appears on the Home page"
                checked={showPinnedEvents}
                onChange={setShowPinnedEvents}
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-slate-800">
                  Display events count on Home
                </div>
                <div className="text-sm text-slate-500">
                  Choose how many upcoming events appear on Home
                </div>

                <div className="mt-4 grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      onClick={() => setDisplayEventsCount(count)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm font-medium transition",
                        displayEventsCount === count
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setScreen("notification-categories")}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">Notify by category</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Choose which calendar categories should display on Home
                  </div>
                </div>
                <span className="text-xl text-slate-400">›</span>
              </button>

              <button
                onClick={saveNotifications}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Save notification settings
              </button>
            </div>
          ) : null}

          {screen === "notification-categories" ? (
            <div className="space-y-3">
              {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((category) => (
                <ToggleRow
                  key={category}
                  title={CATEGORY_LABELS[category]}
                  subtitle={`Display ${CATEGORY_LABELS[category].toLowerCase()} items on Home`}
                  checked={categoryDisplay[category]}
                  onChange={(value) =>
                    setCategoryDisplay((prev) => ({
                      ...prev,
                      [category]: value,
                    }))
                  }
                />
              ))}

              <button
                onClick={saveNotifications}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Save category settings
              </button>
            </div>
          ) : null}

          {screen === "preferences" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Theme</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "system", label: "Follow phone system" },
                    { value: "dark", label: "Dark mode" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setThemeMode(item.value as "system" | "dark")}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm transition",
                        themeMode === item.value
                          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Date display format</div>
                <div className="grid grid-cols-2 gap-2">
                  {["MM/DD/YYYY", "DD/MM/YYYY"].map((item) => (
                    <button
                      key={item}
                      onClick={() => setDateFormat(item as "MM/DD/YYYY" | "DD/MM/YYYY")}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm transition",
                        dateFormat === item
                          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Time display format</div>
                <div className="grid grid-cols-2 gap-2">
                  {["12h", "24h"].map((item) => (
                    <button
                      key={item}
                      onClick={() => setTimeFormat(item as "12h" | "24h")}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm transition",
                        timeFormat === item
                          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Calendar start day</div>
                <div className="grid grid-cols-2 gap-2">
                  {["Sunday", "Monday"].map((item) => (
                    <button
                      key={item}
                      onClick={() => setWeekStartDay(item as "Sunday" | "Monday")}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm transition",
                        weekStartDay === item
                          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Weather unit</div>
                <div className="grid grid-cols-2 gap-2">
                  {["C", "F"].map((item) => (
                    <button
                      key={item}
                      onClick={() => setTemperatureUnit(item as "C" | "F")}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm transition",
                        temperatureUnit === item
                          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      °{item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Do not disturb</div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "system", label: "Follow phone setting" },
                    { value: "custom", label: "Custom time" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() =>
                        setDoNotDisturbMode(item.value as "system" | "custom")
                      }
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-sm transition",
                        doNotDisturbMode === item.value
                          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {doNotDisturbMode === "custom" ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Field label="Start">
                      <input
                        type="time"
                        value={dndStartTime}
                        onChange={(e) => setDndStartTime(e.target.value)}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="End">
                      <input
                        type="time"
                        value={dndEndTime}
                        onChange={(e) => setDndEndTime(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <button
                onClick={savePreferences}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Save preferences
              </button>
            </div>
          ) : null}
        </div>

        <BottomTabBar active="profile" />

        {showMemberSheet ? (
          <div className="fixed inset-0 z-30 flex items-end bg-black/35">
            <button
              className="absolute inset-0"
              aria-label="Close member sheet"
              onClick={() => setShowMemberSheet(false)}
            />

            <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-3 shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {memberSheetMode === "edit" ? "Edit family member" : "Add family member"}
                </h2>
                <button
                  onClick={() => setShowMemberSheet(false)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <Field label="Type">
                  <div className="grid grid-cols-3 gap-2">
                    {MEMBER_TYPE_OPTIONS.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setMemberType(item.value);
                          if (item.value === "pet") setMemberRole("Pet");
                          if (item.value === "kid") setMemberRole("Child");
                          if (item.value === "adult") setMemberRole("Family");
                        }}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-sm transition",
                          memberType === item.value
                            ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Name">
                  <input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder={memberType === "pet" ? "Mochi" : "Lily"}
                    className={inputClass}
                  />
                </Field>

                <Field label="Role">
                  <input
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    placeholder={
                      memberType === "pet"
                        ? "Dog, Cat, Bunny..."
                        : "Child, Son, Daughter, Grandma..."
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Birthday">
                  <input
                    type="date"
                    value={memberBirthday}
                    onChange={(e) => setMemberBirthday(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Avatar">
                  <div className="flex flex-wrap gap-2">
                    {MEMBER_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setMemberAvatar(emoji)}
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full border text-xl",
                          memberAvatar === emoji
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 bg-white"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </Field>

                <button
                  onClick={handleSaveMember}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  {memberSheetMode === "edit" ? "Save member" : "Add member"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showDeleteMemberConfirm ? (
          <ConfirmModal
            title="Delete family member?"
            description="This will remove the family member from the profile list."
            confirmText="Delete"
            onCancel={() => {
              setShowDeleteMemberConfirm(false);
              setShowDeleteLinkedMemberConfirm(false);
              setPendingDeleteMemberId(null);
            }}
            onConfirm={confirmDeleteMember}
            danger
          />
        ) : null}

        {showDeleteLinkedMemberConfirm ? (
          <ConfirmModal
            title="Remove invited family member?"
            description="This person has the same Family ID but a different User ID. Continuing will remove this invited person from your family account."
            confirmText="Remove from family"
            onCancel={() => {
              setShowDeleteLinkedMemberConfirm(false);
              setPendingDeleteMemberId(null);
            }}
            onConfirm={confirmDeleteMember}
            danger
          />
        ) : null}

        {showLogoutConfirm ? (
          <ConfirmModal
            title="Logout?"
            description="You will be signed out of this device."
            confirmText="Logout"
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={() => {
              if (typeof logout === "function") logout();
              setShowLogoutConfirm(false);
            }}
          />
        ) : null}

        {showDeleteAccountConfirm ? (
          <ConfirmModal
            title="Delete account?"
            description="This action cannot be undone."
            confirmText="Delete account"
            onCancel={() => setShowDeleteAccountConfirm(false)}
            onConfirm={() => {
              if (typeof deleteAccount === "function") deleteAccount();
              setShowDeleteAccountConfirm(false);
            }}
            danger
          />
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-800">{title}</div>
        <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-emerald-500" : "bg-slate-300"
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

function ConfirmModal({
  title,
  description,
  confirmText,
  onCancel,
  onConfirm,
  danger,
}: {
  title: string;
  description: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white",
              danger ? "bg-rose-600" : "bg-slate-900"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function BottomTabBar({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white">
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
