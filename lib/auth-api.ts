export type SessionUser = {
  email: string;
  fullName?: string;
  birthday?: string;
  role?: string;
  accountId?: string;
  familyId?: string;
};

export async function signup(payload: {
  email: string;
  password: string;
  fullName?: string;
  birthday?: string;
  role?: string;
  inviteToken?: string;
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
