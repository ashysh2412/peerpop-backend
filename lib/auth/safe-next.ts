/**
 * Returns a same-site path to redirect to after sign-in.
 * Anything that could leave the site (absolute URLs, protocol-relative
 * "//evil.com", backslash tricks) falls back to /home.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/home";
  }
  return next;
}
