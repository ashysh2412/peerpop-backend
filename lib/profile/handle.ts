/** A handle made from someone's name, like "Riya Sharma" → "riyasharma". Always 3 to 24 valid characters. */
export function handleFromName(name: string) {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  if (base.length >= 3) return base;
  return (base + "creator").slice(0, 24);
}

/** The same handle with a few digits added, for when the plain one is taken. */
export function withSuffix(handle: string, random = Math.random) {
  const digits = String(Math.floor(random() * 9000) + 1000);
  return handle.slice(0, 30 - digits.length) + digits;
}
