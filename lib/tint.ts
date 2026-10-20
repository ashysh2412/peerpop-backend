const TINTS = ["bg-pop-yellow", "bg-pop-sky", "bg-pop-mint", "bg-pop-coral", "bg-pop-lilac"] as const;

/** A bright background for someone without a photo, the same every time for the same name or handle. */
export function tintFor(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
