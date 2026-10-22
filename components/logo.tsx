import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Peerpop home">
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-black">
        <Image src="/logo.png" alt="" width={36} height={36} priority />
      </span>
      <span className="text-xl font-bold tracking-tight text-ink">Peerpop</span>
    </Link>
  );
}
