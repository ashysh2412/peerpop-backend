export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type RequestEmail = { name: string; handle: string; city: string | null; message: string | null; siteUrl: string; unsubscribe?: string };

export function connectionRequestEmail({ name, handle, city, message, siteUrl, unsubscribe }: RequestEmail) {
  const reviewUrl = `${siteUrl}/network?tab=received`;
  const profileUrl = `${siteUrl}/creators/${encodeURIComponent(handle)}`;
  const who = city ? `${name} (@${handle}, ${city})` : `${name} (@${handle})`;
  const subject = `${name} wants to connect with you on Peerpop`;
  const text = [
    `${who} wants to connect with you on Peerpop.`,
    message ? `\nTheir note: "${message}"` : "",
    `\nReview the request: ${reviewUrl}`,
    `See their profile: ${profileUrl}`,
    `\nYou're getting this because someone sent you a connection request on Peerpop.`,
    ...(unsubscribe ? [`Turn off these emails: ${unsubscribe}`] : []),
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b;max-width:480px">
<p><b>${escapeHtml(who)}</b> wants to connect with you on Peerpop.</p>
${message ? `<p style="border-left:3px solid #f0b100;padding-left:12px;color:#52525b">${escapeHtml(message)}</p>` : ""}
<p><a href="${reviewUrl}" style="display:inline-block;background:#111111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Review request</a></p>
<p><a href="${profileUrl}" style="color:#111111">See their profile</a></p>
<p style="font-size:12px;color:#71717a">You're getting this because someone sent you a connection request on Peerpop.${unsubscribe ? ` <a href="${unsubscribe}" style="color:#71717a">Turn off these emails</a>` : ""}</p>
</div>`;
  return { subject, text, html };
}

type Button = { text: string; url: string };

/** A short email: one bold lead line, an optional quoted note, a button and a footer reason. */
export function simpleEmail({
  lead,
  note,
  button,
  reason,
  unsubscribe,
}: {
  lead: string;
  note?: string | null;
  button: Button;
  reason: string;
  /** Link that turns this kind of email off, shown in the footer. */
  unsubscribe?: string;
}) {
  const footer = unsubscribe ? [`Turn off these emails: ${unsubscribe}`] : [];
  const text = [lead, note ? `\n"${note}"` : "", `\n${button.text}: ${button.url}`, `\n${reason}`, ...footer].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b;max-width:480px">
<p>${escapeHtml(lead)}</p>
${note ? `<p style="border-left:3px solid #f0b100;padding-left:12px;color:#52525b">${escapeHtml(note)}</p>` : ""}
<p><a href="${button.url}" style="display:inline-block;background:#111111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${escapeHtml(button.text)}</a></p>
<p style="font-size:12px;color:#71717a">${escapeHtml(reason)}${unsubscribe ? ` <a href="${unsubscribe}" style="color:#71717a">Turn off these emails</a>` : ""}</p>
</div>`;
  return { text, html };
}

/** The launch invite for people from the old Peerpop waiting list and app. */
export function inviteEmail({ name, siteUrl }: { name: string | null; siteUrl: string }) {
  const subject = "Peerpop is open. Come on in!";
  const hi = name ? `Hi ${name},` : "Hi,";
  const body = [
    "Peerpop is now open, and because you signed up early, you're one of the first in.",
    "Make your free profile in a minute, then find creators across India to shoot, edit and collab with.",
  ];
  const url = `${siteUrl}/login`;
  const reason = "You're getting this because you signed up for early access to Peerpop. If you'd rather not hear from us, just reply and tell us.";
  const text = [hi, "", ...body, "", `Join Peerpop: ${url}`, "", reason].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b;max-width:480px">
<p>${escapeHtml(hi)}</p>
${body.map((b) => `<p>${escapeHtml(b)}</p>`).join("\n")}
<p><a href="${url}" style="display:inline-block;background:#111111;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">Join Peerpop</a></p>
<p style="font-size:12px;color:#71717a">${escapeHtml(reason)}</p>
</div>`;
  return { subject, text, html };
}
