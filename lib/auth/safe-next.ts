/**
 * Returns a same-site path to redirect to after sign-in.
 * Anything that could leave the site (absolute URLs, protocol-relative
 * "//evil.com", backslash tricks, and tabs or newlines that browsers strip
 * so "/\t/evil.com" becomes "//evil.com") falls back to /home.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\x00-\x20\x7f]/.test(next)) {
    return "/home";
  }
  return next;
}
