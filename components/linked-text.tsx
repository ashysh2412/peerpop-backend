import Link from "next/link";
import { linkParts } from "@/lib/linkify";

/** Plain text with any web links made tappable. Peerpop links stay in the app. */
export function LinkedText({ text }: { text: string }) {
  return linkParts(text).map((p, i) =>
    !p.href ? (
      p.text
    ) : p.internal ? (
      <Link key={i} href={p.href} className="font-semibold underline underline-offset-2">
        {p.text}
      </Link>
    ) : (
      <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline underline-offset-2">
        {p.text}
      </a>
    ),
  );
}
