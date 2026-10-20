const TINTS = ["bg-pop-yellow/50", "bg-pop-sky/50", "bg-pop-mint/50", "bg-pop-coral/40", "bg-pop-lilac/60"] as const;

/** A soft background for someone without a photo, the same every time for the same name or handle. */
export function tintFor(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
