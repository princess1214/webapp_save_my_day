"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useNestliStore } from "../lib/nestli-store";

type RoleOption =
  | "Mom"
  | "Dad"
  | "Parent"
  | "Guardian"
  | "Grandparent"
  | "Custom";

const ROLE_OPTIONS: RoleOption[] = [
  "Mom",
  "Dad",
  "Parent",
  "Guardian",
  "Grandparent",
  "Custom",
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function calculateAge(birthday: string) {
  if (!birthday) return null;

  const today = new Date();
  const birth = new Date(`${birthday}T12:00:00`);

  if (Number.isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getPasswordStrength(password: string): "Weak" | "Medium" | "Strong" {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) || /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return "Weak";
  if (score <= 3) return "Medium";
  return "Strong";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isPasswordAllowed(password: string) {
  const strength = getPasswordStrength(password);
  return strength === "Medium" || strength === "Strong";
}

function formatBirthdayTitle(name: string) {
  return `${name}'s Birthday`;
}

export default function WelcomePage() {
  const router = useRouter();
  const store = useNestliStore() as any;

  const {
    profile,
    updateProfile,
    addEvent,
    appPreferences,
  } = store;

  const [mounted, setMounted] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  const [email, setEmail] = useState(profile?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthday, setBirthday] = useState(profile?.birthday || "");
  const [roleSelection, setRoleSelection] = useState<RoleOption>("Mom");
  const [customRole, setCustomRole] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || "");

  // restored because the forgot-password UI below still uses them
  const [showForgotPasswordBox, setShowForgotPasswordBox] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const themeMode = appPreferences?.themeMode ?? "system";

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

  const isDarkMode =
    themeMode === "dark" || (themeMode === "system" && systemPrefersDark);

  const passwordStrength = useMemo(() => {
    return getPasswordStrength(password);
  }, [password]);

  const age = useMemo(() => calculateAge(birthday), [birthday]);
  const isUnder13 = typeof age === "number" ? age < 13 : false;

  const resolvedRole =
    roleSelection === "Custom" ? customRole.trim() : roleSelection;

  const canCreateAccount =
    isValidEmail(email) &&
    isPasswordAllowed(password) &&
    password === confirmPassword &&
    password.length > 0 &&
    Boolean(birthday) &&
    !isUnder13 &&
    Boolean(resolvedRole) &&
    Boolean(displayName.trim());

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function upsertBirthdayEvent() {
    if (!birthday || !addEvent) return;

    addEvent({
      id: "birthday-profile-self",
      title: formatBirthdayTitle(displayName.trim() || "My"),
      date: birthday,
      time: "09:00",
      durationMinutes: 60,
      category: "event",
      memberIds: ["all"],
      notes: "Birthday reminder",
      location: "",
      pinned: false,
      importance: "normal",
      recurrence: "annually",
      recurrenceEndDate: "",
      recurrenceDays: [],
      recurrenceEveryHours: "",
      reminderMinutes: "1440",
    });
  }

  function handleCreateAccount() {
    clearMessages();

    if (!displayName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!isPasswordAllowed(password)) {
      setErrorMessage(
        "Please choose a medium or strong passcode with at least 8 characters, including letters, numbers, or symbols."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!birthday) {
      setErrorMessage("Please enter your birthday.");
      return;
    }

    if (isUnder13) {
      setErrorMessage(
        "Children under age 13 should be registered by parents or guardians."
      );
      return;
    }

    if (!resolvedRole) {
      setErrorMessage("Please select your family role.");
      return;
    }

    updateProfile?.({
      displayName: displayName.trim(),
      firstName: displayName.trim(),
      email: email.trim(),
      birthday,
      role: resolvedRole,
      passcode: password,
      phone: "",
    });
    
    localStorage.setItem(
      "demo_user_email",
      email.trim().toLowerCase()
    );

    upsertBirthdayEvent();
    setSuccessMessage("Family account created.");
    window.setTimeout(() => {
      router.push("/home");
    }, 500);
  }

  function handleForgotPassword() {
    clearMessages();

    if (!isValidEmail(forgotPasswordEmail)) {
      setErrorMessage("Please enter a valid email for password reset.");
      return;
    }

    setForgotPasswordSent(true);
    setSuccessMessage(
      "Password reset link sent. Please check your email."
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
          "mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8",
          isDarkMode ? "bg-slate-950" : "bg-white"
        )}
      >
        <div className="mb-8">
          <div
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
              isDarkMode
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-emerald-50 text-emerald-700"
            )}
          >
            Nestli
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight">
            A warm place for your family’s everyday life
          </h1>

          <p
            className={cn(
              "mt-3 text-sm leading-6",
              isDarkMode ? "text-slate-400" : "text-slate-500"
            )}
          >
            Create your family account to organize reminders, calendars, notes,
            and everyday moments in one private place.
          </p>
        </div>

        <section
          className={cn(
            "mb-6 rounded-3xl border p-5",
            isDarkMode
              ? "border-slate-800 bg-slate-900"
              : "border-slate-200 bg-slate-50"
          )}
        >
          <h2 className="text-base font-semibold">What you can do with Nestli</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span>📅</span>
              <span>Manage family calendar and events</span>
            </div>
            <div className="flex items-start gap-3">
              <span>📝</span>
              <span>Keep personal and family notes</span>
            </div>
            <div className="flex items-start gap-3">
              <span>💛</span>
              <span>Save memories and family moments</span>
            </div>
            <div className="flex items-start gap-3">
              <span>⏰</span>
              <span>Track important dates and reminders</span>
            </div>
            <div className="flex items-start gap-3">
              <span>👨‍👩‍👧‍👦</span>
              <span>Organize family information in one place</span>
            </div>
            <div className="flex items-start gap-3">
              <span>🔗</span>
              <span>Share schedules with family members</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Field label="Your name" darkMode={isDarkMode}>
            <input
              value={displayName}
              onChange={(e) => {
                clearMessages();
                setDisplayName(e.target.value);
              }}
              placeholder="Emily"
              className={cn(
                baseInputClass,
                isDarkMode && darkInputClass
              )}
            />
          </Field>

          <Field label="Email address" darkMode={isDarkMode}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                clearMessages();
                const value = e.target.value;
                setEmail(value);

                const existingEmail = localStorage.getItem("demo_user_email");
                if (existingEmail && existingEmail === value.trim().toLowerCase()) {
                  setEmailExists(true);
                } else {
                  setEmailExists(false);
                }
              }}
              placeholder="you@example.com"
              className={cn(
                baseInputClass,
                isDarkMode && darkInputClass
              )}
            />
          </Field>

          {emailExists ? (
            <p className="text-sm text-emerald-600 mt-2">
              This email already has an account.{" "}
              <Link href="/login" className="underline">
                Go to login
              </Link>
            </p>
          ) : null}

          <Field label="Create a passcode" darkMode={isDarkMode}>
            <div className="space-y-2">
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  clearMessages();
                  setPassword(e.target.value);
                }}
                placeholder="At least 8 characters"
                className={cn(
                  baseInputClass,
                  isDarkMode && darkInputClass
                )}
              />

              <div className="flex items-center justify-between text-xs">
                <span className={cn(isDarkMode ? "text-slate-500" : "text-slate-400")}>
                  Use letters, numbers, and symbols
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    passwordStrength === "Weak"
                      ? "text-rose-500"
                      : passwordStrength === "Medium"
                      ? "text-amber-500"
                      : "text-emerald-600"
                  )}
                >
                  Strength: {passwordStrength}
                </span>
              </div>
            </div>
          </Field>

          <Field label="Confirm passcode" darkMode={isDarkMode}>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                clearMessages();
                setConfirmPassword(e.target.value);
              }}
              placeholder="Re-enter your passcode"
              className={cn(
                baseInputClass,
                isDarkMode && darkInputClass
              )}
            />
          </Field>

          <Field label="Birthday" darkMode={isDarkMode}>
            <div className="space-y-2">
              <input
                type="date"
                value={birthday}
                onChange={(e) => {
                  clearMessages();
                  setBirthday(e.target.value);
                }}
                className={cn(
                  baseInputClass,
                  isDarkMode && darkInputClass
                )}
              />

              <p
                className={cn(
                  "text-xs",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}
              >
                We will create a birthday event for you automatically.
              </p>

              {isUnder13 ? (
                <p className="text-sm font-medium text-rose-500">
                  Children under age 13 should be registered by parents.
                </p>
              ) : null}
            </div>
          </Field>

          <Field label="Family role" darkMode={isDarkMode}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setRoleSelection(item);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm transition",
                      roleSelection === item
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

              {roleSelection === "Custom" ? (
                <input
                  value={customRole}
                  onChange={(e) => {
                    clearMessages();
                    setCustomRole(e.target.value);
                  }}
                  placeholder="Enter your family role"
                  className={cn(
                    baseInputClass,
                    isDarkMode && darkInputClass
                  )}
                />
              ) : null}
            </div>
          </Field>
        </section>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleCreateAccount}
          disabled={!canCreateAccount}
          className={cn(
            "mt-6 w-full rounded-2xl px-4 py-4 text-sm font-semibold text-white transition",
            canCreateAccount
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "cursor-not-allowed bg-slate-300 text-slate-500"
          )}
        >
          Create family account
        </button>

        <p
          className={cn(
            "mt-5 text-center text-xs leading-5",
            isDarkMode ? "text-slate-500" : "text-slate-400"
          )}
        >
          Nestli is a private family organization app. We do not sell your
          personal data. You can control optional data sharing in settings and
          delete your account at any time.
        </p>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-emerald-600">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

const baseInputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white";

const darkInputClass =
  "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:bg-slate-900";

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