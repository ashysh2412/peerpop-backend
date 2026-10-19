/** How to look a channel up with channels.list. */
export type ChannelRef = { by: "id"; value: string } | { by: "handle"; value: string } | { by: "username"; value: string };

const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const CHANNEL_ID = /^UC[\w-]{22}$/;
const HANDLE = /^[\w.\-·]{3,30}$/;

/**
 * Reads a channel link (or a bare @handle). Returns null for shapes we can't
 * resolve cheaply, such as /c/name links, so the UI can ask for the @handle.
 */
export function parseChannelUrl(input: string): ChannelRef | null {
  const raw = input.trim();
  if (raw.startsWith("@")) {
    const handle = raw.slice(1);
    return HANDLE.test(handle) ? { by: "handle", value: handle } : null;
  }

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname)) return null;

  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (!first) return null;
  if (first.startsWith("@")) {
    const handle = decodeURIComponent(first.slice(1));
    return HANDLE.test(handle) ? { by: "handle", value: handle } : null;
  }
  if (first === "channel" && second && CHANNEL_ID.test(second)) return { by: "id", value: second };
  if (first === "user" && second) return { by: "username", value: second };
  return null;
}
