import "server-only";

const FROM = "Peerpop <hello@peerpop.in>";

export type Email = { to: string; subject: string; html: string; text: string };

/** Sends through Resend. Without RESEND_API_KEY it does nothing, so local dev and previews stay quiet. */
export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY?.replace(/\s+/g, "");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, ...email }),
  });
  // Log the status only: the body can echo request details.
  if (!res.ok) console.error(`Resend email failed with ${res.status}`);
  return res.ok;
}

/** Sends up to 100 emails in one Resend call. Returns false if email isn't set up or Resend refused the batch. */
export async function sendEmails(emails: Email[]) {
  const key = process.env.RESEND_API_KEY?.replace(/\s+/g, "");
  if (!key || emails.length === 0) return false;
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(emails.slice(0, 100).map((e) => ({ from: FROM, ...e }))),
  });
  if (!res.ok) console.error(`Resend batch failed with ${res.status}`);
  return res.ok;
}

export function emailIsSetUp() {
  return !!process.env.RESEND_API_KEY?.trim();
}
