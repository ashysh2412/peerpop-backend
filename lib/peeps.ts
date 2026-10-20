// Cartoon stand-ins (Open Peeps, CC0) for creators without a photo, in /public/characters.
const PEEPS = ["riya", "arjun", "sana", "kabir", "neha", "om", "isha", "rohan", "dev", "meera"] as const;
const BGS = ["bg-pop-yellow", "bg-pop-sky", "bg-pop-mint", "bg-pop-coral", "bg-pop-lilac"] as const;

function hash(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** The same character and background colour every time for the same name or handle. */
export function peepFor(key: string) {
  const i = hash(key) % PEEPS.length;
  return { src: `/characters/${PEEPS[i]}.svg`, bg: BGS[(i + key.length) % BGS.length] };
}
