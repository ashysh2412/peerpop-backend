/** A coloured square with the group's first letter, so every group is easy to spot. */
export function GroupBadge({ name, size = 48 }: { name: string; size?: number }) {
  const tones = ["bg-brand text-ink", "bg-ink text-brand", "bg-emerald-400 text-ink", "bg-sky-300 text-ink", "bg-rose-300 text-ink"];
  const tone = tones[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % tones.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl font-extrabold ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
