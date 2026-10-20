import Image from "next/image";
import { avatarUrl } from "@/lib/profile/avatar";
import { peepFor } from "@/lib/peeps";

/** Round profile photo, or a cartoon character picked from the name when there's no photo. */
export function Avatar({ path, name, size = 40 }: { path: string | null; name: string; size?: number }) {
  const url = avatarUrl(path);
  const peep = peepFor(name);
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border-2 border-ink ${url ? "bg-sunken" : peep.bg}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <Image src={peep.src} alt={name} fill unoptimized className="translate-y-[6%] object-contain" />
      )}
    </div>
  );
}
