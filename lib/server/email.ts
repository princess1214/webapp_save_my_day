type EmailPayload = { to: string; subject: string; html: string };

function config() {
  return {
    apiKey: process.env.EMAIL_PROVIDER_API_KEY || process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || process.env.RESEND_FROM,
  };
}

export function isEmailConfigured() {
  const { apiKey, from } = config();
  return Boolean(apiKey && from);
}

export async function sendEmail(payload: EmailPayload) {
  const { apiKey, from } = config();
  if (!apiKey || !from) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [payload.to], subject: payload.subject, html: payload.html }),
  });
  if (!response.ok) {
    const providerRequestId = response.headers.get("x-request-id");
    throw new Error(`Email provider failed (${response.status}, request ${providerRequestId || "unknown"})`);
  }
}

export function appBaseUrl(req: Request) {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");
}
