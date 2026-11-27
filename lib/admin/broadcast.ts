/** Who gets a message from the official Peerpop account. Pure, so it can be tested. */
export type BroadcastAudience = "new" | "basics" | "incomplete" | "everyone";

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
    if (audience === "basics") return p.gaps.includes("City") || p.gaps.includes("Niches");
    return p.gaps.length > 0;
  });
}

/** Fills {name} with the person's first name ("there" when unknown). */
export function personalise(text: string, name: string | null): string {
  const first = name?.trim().split(/\s+/)[0] || "there";
  return text.replace(/\{name\}/gi, first);
}

/** The Peerpop welcome: the default on Message members, and what new members get automatically on the evening they join. */
export const WELCOME_TEXT = `Hi {name}! 👋 Ashish here, founder of Peerpop.

Ek reel. Do audience. 🤝 Collab with a creator your size and you both grow.

But other creators can only find you if your profile is complete. It takes 2 minutes:
📸 Add a photo
🎯 Pick your niche
🎬 Add one video of your work

Finish it here: www.peerpop.in/settings/profile

Stuck anywhere? Just reply here. I read every message.`;

/** The default message for members who haven't added their city or niche yet. */
export const BASICS_TEXT = `Hi {name}! 👋 Ashish here, founder of Peerpop.

Ek chhota sa kaam, bas 30 second ka 🙏
Apni profile mein yeh do cheezein add kar do:
📍 Aapki city
🎯 Aapka niche (food, comedy, fashion, tech...)

Kyun? Do reasons:
1. Hum brands ko city aur niche ke hisaab se creators suggest karenge. Yeh blank hai toh aap list mein aaoge hi nahi.
2. Aapke shehar ke aur aapke type ke creators aapko collab ke liye dhoondh paayenge. Ek reel. Do audience. 🤝

Yahan add karo: www.peerpop.in/settings/profile

Google Maps bhi location maangta hai, hum toh sirf city maang rahe hain 😄
Koi dikkat ho toh yahin reply karo.`;

/** The message each audience starts with on Message members. */
export function defaultText(audience: BroadcastAudience): string {
  return audience === "basics" ? BASICS_TEXT : WELCOME_TEXT;
}
