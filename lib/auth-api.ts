const STORAGE_KEY = "demo_user";
const SESSION_KEY = "demo_session";
const MAILBOX_KEY = "demo_mailbox";

export type SessionUser = {
  email: string;
  fullName?: string;
  birthday?: string;
  role?: string;
  accountId?: string;
  familyId?: string;
};

type LoginContext = {
  userAgent?: string;
  ip?: string | null;
  location?: string;
  loggedAt: string;
};

function delay(ms = 500) {
  return new Promise((r) => setTimeout(r, ms));
}

function generateAccountNumber() {
  const stamp = Date.now().toString().slice(-9);
  const rand = Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, "0");
  return `${stamp}${rand}`;
}

async function fetchLoginContext(): Promise<LoginContext> {
  try {
    const res = await fetch("/api/auth/context", { cache: "no-store" });
    if (!res.ok) {
      return {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown device",
        location: "Unknown location",
        loggedAt: new Date().toISOString(),
      };
    }

    const data = await res.json();
    return {
      userAgent: data.userAgent,
      ip: data.ip,
      location: data.location,
      loggedAt: new Date().toISOString(),
    };
  } catch {
    return {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown device",
      location: "Unknown location",
      loggedAt: new Date().toISOString(),
    };
  }
}

export async function signup(payload: {
  email: string;
  password: string;
  fullName?: string;
  birthday?: string;
  role?: string;
}) {
  await delay();

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const user = JSON.parse(existing);
    if (user.email === payload.email.toLowerCase()) {
      throw new Error("This email is already registered. Please log in.");
    }
  }

  const accountId = generateAccountNumber();
  const context = await fetchLoginContext();

  const user = {
    email: payload.email.toLowerCase(),
    fullName: payload.fullName,
    birthday: payload.birthday,
    role: payload.role,
    password: payload.password,
    accountId,
    familyId: accountId,
    accountCreationLocation: context.location || null,
    birthYear: payload.birthday ? Number(payload.birthday.slice(0, 4)) : null,
    loginHistory: [] as LoginContext[],
  };
  localStorage.setItem("assistmyday_account_number", accountId);
  localStorage.setItem("assistmyday_account_id", accountId);
  localStorage.setItem("assistmyday_family_id", accountId);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, "true");
  const mailboxRaw = localStorage.getItem(MAILBOX_KEY);
  const mailbox = mailboxRaw ? JSON.parse(mailboxRaw) : [];
  mailbox.unshift({
    id: `welcome-${Date.now()}`,
    to: user.email,
    subject: "Welcome to AssistMyDay",
    body: `Hi ${user.fullName || "there"},\n\nWelcome to AssistMyDay 💚 We're so happy you are here.\n\nLog in anytime: ${typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}\n\nYour account ID: ${accountId}\nFamily ID: ${accountId}\n\nWarmly,\nAssistMyDay Team`,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(MAILBOX_KEY, JSON.stringify(mailbox));

  return { success: true, user, welcomeEmailQueued: true };
}

export async function login(payload: { email: string; password: string }) {
  await delay();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("Account not found");

  const user = JSON.parse(raw);

  if (
    user.email !== payload.email.toLowerCase() ||
    user.password !== payload.password
  ) {
    throw new Error("Invalid email or passcode");
  }

  const context = await fetchLoginContext();
  const loginHistory = (user.loginHistory || []) as LoginContext[];
  const previous = loginHistory[0];

  if (
    previous &&
    (previous.userAgent !== context.userAgent || previous.location !== context.location)
  ) {
    const mailboxRaw = localStorage.getItem(MAILBOX_KEY);
    const mailbox = mailboxRaw ? JSON.parse(mailboxRaw) : [];
    mailbox.unshift({
      id: `security-${Date.now()}`,
      to: user.email,
      subject: "AssistMyDay security alert: New login detected",
      body: `We noticed a login from a new device/location.\n\nPrevious: ${previous.userAgent} @ ${previous.location}\nCurrent: ${context.userAgent} @ ${context.location}\n\nIf this wasn't you, please change your password now.`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(MAILBOX_KEY, JSON.stringify(mailbox));
  }

  const updatedUser = {
    ...user,
    loginHistory: [context, ...loginHistory].slice(0, 12),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
  localStorage.setItem(SESSION_KEY, "true");

  return { success: true, user: updatedUser };
}

export async function logout() {
  await delay();
  localStorage.removeItem(SESSION_KEY);
  return { success: true };
}

export async function getSession() {
  await delay();

  const session = localStorage.getItem(SESSION_KEY);
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!session || !raw) {
    throw new Error("Not logged in");
  }

  return {
    authenticated: true,
    user: JSON.parse(raw),
  };
}

export async function requestPasswordReset({ email }: { email: string }) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || "Unable to send reset link.");
  }

  return data;
}

export async function verifyResetToken(token: string) {
  await delay();
  return { valid: true };
}
export async function resetPassword({
  token,
  password,
}: {
  token: string;
  password: string;
}) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, password }),
  });

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || "Unable to reset passcode.");
  }

  return data;
}
