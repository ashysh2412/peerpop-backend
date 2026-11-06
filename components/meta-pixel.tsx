"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { META_PIXEL_ID, pixelAllowedHere, trackPixel } from "@/lib/meta-pixel";

// Meta's own snippet. It records the first PageView itself; later page changes inside the app
// (which don't reload the page) are sent from the effect below.
const SNIPPET = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;

export function MetaPixel() {
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hostname is only known in the browser
    setEnabled(pixelAllowedHere());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (lastPath.current === null) {
      lastPath.current = pathname; // the snippet already counted this first page
      return;
    }
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPixel("PageView");
  }, [enabled, pathname]);

  if (!enabled) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {SNIPPET}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

/** Counts a brand-new member once (shown on the feed's welcome note). */
export function PixelSignedUp({ userId }: { userId: string }) {
  useEffect(() => {
    const key = `pp-pixel-signup-${userId}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {}
    // The pixel script may still be loading; give it a moment.
    const t = window.setTimeout(() => {
      if (
        !pixelAllowedHere() ||
        typeof (window as unknown as { fbq?: unknown }).fbq !== "function"
      )
        return;
      trackPixel("CompleteRegistration");
      try {
        localStorage.setItem(key, "1");
      } catch {}
    }, 1500);
    return () => window.clearTimeout(t);
  }, [userId]);
  return null;
}
