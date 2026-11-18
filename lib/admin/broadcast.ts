/** Who gets a message from the official Peerpop account. Pure, so it can be tested. */
export type BroadcastAudience = "incomplete" | "everyone";

export type BroadcastPerson = { id: string; name: string | null; handle: string | null; gaps: string[] };

export function pickRecipients(people: BroadcastPerson[], audience: BroadcastAudience, officialId: string, blocked: Set<string>): BroadcastPerson[] {
  return people.filter((p) => p.id !== officialId && !!p.handle && !blocked.has(p.id) && (audience === "everyone" || p.gaps.length > 0));
}

/** Fills {name} with the person's first name ("there" when unknown). */
export function personalise(text: string, name: string | null): string {
  const first = name?.trim().split(/\s+/)[0] || "there";
  return text.replace(/\{name\}/gi, first);
}
