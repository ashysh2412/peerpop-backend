/** A web address for a group, like "Pune Food Creators" → "pune-food-creators". Always 3 to 40 valid characters. */
export function slugFromName(name: string) {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 34)
    .replace(/-+$/, "");
  return base.length < 3 ? `${base}-group`.replace(/^-/, "") : base;
}

/** The same address with a few digits added, for when the plain one is taken. */
export function slugWithSuffix(slug: string, random = Math.random) {
  return `${slug.slice(0, 35)}-${Math.floor(random() * 9000) + 1000}`;
}
