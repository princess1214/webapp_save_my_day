export type SessionUser = {
  email: string;
  fullName?: string;
  birthday?: string;
  role?: string;
  accountId?: string;
  familyId?: string;
};

async function post(path:string, body:unknown){const res=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await res.json().catch(()=>null);if(!res.ok)throw new Error(data?.message||"Request failed");return data;}

export async function signup(payload: { email: string; password: string; fullName?: string; birthday?: string; role?: string; inviteFamilyId?: string; }) { return post("/api/auth/signup", payload); }
export async function login(payload: { email: string; password: string }) { return post("/api/auth/login", payload); }
export async function logout() { return post("/api/auth/logout", {}); }
export async function getSession() { const res=await fetch("/api/auth/session",{cache:"no-store"}); const data=await res.json().catch(()=>null); if(!res.ok) throw new Error(data?.message||"Not logged in"); return data; }
export async function requestPasswordReset({ email }: { email: string }) { return post("/api/auth/forgot-password", {email}); }
export async function verifyResetToken(_token: string) { return { valid: true }; }
export async function resetPassword({ token, password }: { token: string; password: string; }) { return post("/api/auth/reset-password", {token,password}); }
