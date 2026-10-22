/** Turns text pasted from a spreadsheet or admin page into a list of people to invite. Pure, so it can be tested. */

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;

export type Invitee = { email: string; name: string | null };

function nameFrom(before: string) {
  // The cell just before the email, e.g. "Asha Rao" in "1  Asha Rao  asha@x.com".
  const cells = before.split(/\t|\s{2,}|,|\|/).map((c) => c.trim());
  const cell = cells.reverse().find((c) => /\p{L}/u.test(c)) ?? "";
  const name = cell
    .replace(/^[^\p{L}]+|[^\p{L}.')]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return name && name.length <= 60 ? name : null;
}

export function parseInvitees(text: string): Invitee[] {
  const seen = new Map<string, Invitee>();
  for (const line of text.split(/\r?\n/)) {
    for (const m of line.matchAll(EMAIL)) {
      const email = m[0].toLowerCase().replace(/\.+$/, "");
      if (email.length > 254 || seen.has(email)) continue;
      seen.set(email, { email, name: m.index === line.search(EMAIL) ? nameFrom(line.slice(0, m.index)) : null });
    }
  }
  return [...seen.values()];
}

export function firstName(name: string | null) {
  return name?.split(" ")[0] || null;
}
