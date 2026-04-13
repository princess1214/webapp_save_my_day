const STORAGE_KEY = "demo_user";
const SESSION_KEY = "demo_session";
const MAILBOX_KEY = "demo_mailbox";

export type SessionUser = {
  email: string;
  fullName?: string;
  birthday?: string;
  role?: string;
};

function delay(ms = 500) {
  return new Promise((r) => setTimeout(r, ms));
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

  const user = {
    email: payload.email.toLowerCase(),
    fullName: payload.fullName,
    birthday: payload.birthday,
    role: payload.role,
    password: payload.password,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, "true");
  const mailboxRaw = localStorage.getItem(MAILBOX_KEY);
  const mailbox = mailboxRaw ? JSON.parse(mailboxRaw) : [];
  mailbox.unshift({
    id: `welcome-${Date.now()}`,
    to: user.email,
    subject: "Welcome to Nestli 💚",
    body: `Hi ${user.fullName || "there"}, welcome to Nestli! We're glad you're here.`,
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

  localStorage.setItem(SESSION_KEY, "true");

  return { success: true, user };
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
