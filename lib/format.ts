/** Compact counts the way YouTube and Instagram show them: 8.4K, 1.2M. */
export function compactNumber(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
