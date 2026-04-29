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
  return `${Math.floor(Math.random() * 10_000_000_000_000)
    .toString()
    .padStart(13, "0")
    .slice(0, 13)}`;
}

function generateFamilyId() {
  return Math.random().toString(36).slice(2, 8).padEnd(6, "0");
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
  const res = await fetch("/api/auth/signup", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Signup failed");
  return data;
}

export async function login(payload: { email: string; password: string }) {
  const res = await fetch("/api/auth/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Login failed");
  return data;
}

export async function logout() {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  if (!res.ok) throw new Error("Logout failed");
  return { success: true };
}

export async function getSession() {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Not logged in");
  return data;
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
