export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type RequestEmail = { name: string; handle: string; city: string | null; message: string | null; siteUrl: string };

export function connectionRequestEmail({ name, handle, city, message, siteUrl }: RequestEmail) {
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
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b;max-width:480px">
<p><b>${escapeHtml(who)}</b> wants to connect with you on Peerpop.</p>
${message ? `<p style="border-left:3px solid #7c3aed;padding-left:12px;color:#52525b">${escapeHtml(message)}</p>` : ""}
<p><a href="${reviewUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Review request</a></p>
<p><a href="${profileUrl}" style="color:#7c3aed">See their profile</a></p>
<p style="font-size:12px;color:#71717a">You're getting this because someone sent you a connection request on Peerpop.</p>
</div>`;
  return { subject, text, html };
}
