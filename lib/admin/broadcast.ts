/** Who gets a message from the official Peerpop account. Pure, so it can be tested. */
export type BroadcastAudience = "new" | "incomplete" | "everyone";

export type BroadcastPerson = { id: string; name: string | null; handle: string | null; gaps: string[] };

export function pickRecipients(
  people: BroadcastPerson[],
  audience: BroadcastAudience,
  officialId: string,
  blocked: Set<string>,
  messaged: Set<string> = new Set(),
): BroadcastPerson[] {
  return people.filter((p) => {
    if (p.id === officialId || !p.handle || blocked.has(p.id)) return false;
    if (audience === "everyone") return true;
    if (audience === "new") return p.gaps.length > 0 && !messaged.has(p.id);
    return p.gaps.length > 0;
  });
}

/** Fills {name} with the person's first name ("there" when unknown). */
export function personalise(text: string, name: string | null): string {
  const first = name?.trim().split(/\s+/)[0] || "there";
  return text.replace(/\{name\}/gi, first);
}
