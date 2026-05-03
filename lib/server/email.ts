export async function sendPasswordResetEmail(payload: { to: string; resetUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.warn("Password reset email not sent: RESEND_API_KEY/EMAIL_FROM missing.");
    return { sent: false, reason: "provider_not_configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: "Reset your AssistMyDay password",
      html: `<p>You requested a password reset.</p><p><a href=\"${payload.resetUrl}\">Reset your password</a></p><p>This link expires in 30 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email provider failed: ${response.status} ${text}`);
  }

  return { sent: true as const };
}
