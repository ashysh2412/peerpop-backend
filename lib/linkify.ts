// Finds web links in plain text, so chat messages can show them as tappable links. Pure, so it can be tested.
export type TextPart = { text: string; href?: string; internal?: boolean };

const LINK = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
const PEERPOP = /^(?:https?:\/\/)?(?:www\.)?peerpop\.in(?=\/|$)/i;

export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    // Leave sentence punctuation after a link outside it.
    const url = m[0].replace(/[.,!?;:)\]'"]+$/, "");
    const start = m.index!;
    if (start > last) parts.push({ text: text.slice(last, start) });
    if (PEERPOP.test(url)) parts.push({ text: url, href: url.replace(PEERPOP, "") || "/", internal: true });
    else parts.push({ text: url, href: /^https?:\/\//i.test(url) ? url : `https://${url}` });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
