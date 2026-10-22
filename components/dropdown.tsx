"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A `<details>` popover that closes itself like a normal menu: on a click outside,
 * on Escape, after picking a link or submitting a form inside it, and on navigation.
 */
export function Dropdown({
  className,
  summary,
  summaryClassName,
  children,
}: {
  className?: string;
  summary: ReactNode;
  summaryClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const close = () => {
      if (ref.current) ref.current.open = false;
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details
      ref={ref}
      className={className}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) ref.current!.open = false;
      }}
      onSubmit={() => {
        ref.current!.open = false;
      }}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
