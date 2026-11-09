// Meta (Facebook) Pixel: tells Meta when people from our Instagram ads visit and sign up,
// so ads can be measured. Runs only on the real site (peerpop.in), never on previews or localhost.

export const META_PIXEL_ID = "831935289627497";

type Fbq = (command: "init" | "track", ...args: unknown[]) => void;

export function pixelAllowedHere(): boolean {
  return (
    typeof window !== "undefined" &&
    /(^|\.)peerpop\.in$/.test(window.location.hostname)
  );
}

/** Sends a standard event (PageView, CompleteRegistration...) if the pixel is running. */
export function trackPixel(event: string, params?: Record<string, unknown>) {
  if (!pixelAllowedHere()) return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq !== "function") return;
  if (params) fbq("track", event, params);
  else fbq("track", event);
}
