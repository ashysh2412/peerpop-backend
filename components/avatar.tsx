import Image from "next/image";
import { avatarUrl } from "@/lib/profile/avatar";
import { tintFor } from "@/lib/tint";

/** Round profile photo, or the first letter of the name when there's no photo. */
export function Avatar({ path, name, size = 40 }: { path: string | null; name: string; size?: number }) {
  const url = avatarUrl(path);
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full ${url ? "bg-sunken" : tintFor(name)}`} style={{ width: size, height: size }}>
      {url ? (
        <Image src={url} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-ink/70" style={{ fontSize: size * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
