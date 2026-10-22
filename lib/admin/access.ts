/** Emails allowed into /admin, from the ADMIN_EMAILS setting (comma-separated). */
export function isAdminEmail(email: string | null | undefined, list = process.env.ADMIN_EMAILS ?? "") {
  if (!email) return false;
  const allowed = list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
