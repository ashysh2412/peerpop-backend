import type { SVGProps } from "react";

// Hand-drawn marks for the homepage. They take their colour from `currentColor`.
type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Squiggle(props: P) {
  return (
    <svg viewBox="0 0 220 24" preserveAspectRatio="none" {...base} strokeWidth={6} aria-hidden {...props}>
      <path d="M4 16c18-10 30 8 48-2s30-10 48 0 30 8 48-2 30-10 48 0 16 4 20 2" />
    </svg>
  );
}

export function Star(props: P) {
  return (
    <svg viewBox="0 0 40 40" {...base} aria-hidden {...props}>
      <path d="M20 4c1 8 4 13 16 16-12 3-15 8-16 16-1-8-4-13-16-16 12-3 15-8 16-16z" fill="currentColor" />
    </svg>
  );
}

export function Sparks(props: P) {
  return (
    <svg viewBox="0 0 40 40" {...base} aria-hidden {...props}>
      <path d="M20 3v9M20 28v9M3 20h9M28 20h9M8 8l5 5M27 27l5 5M32 8l-5 5M13 27l-5 5" />
    </svg>
  );
}

export function Heart(props: P) {
  return (
    <svg viewBox="0 0 40 40" {...base} aria-hidden {...props}>
      <path d="M20 34S5 25 5 14c0-5 4-8 8-8 3 0 6 2 7 5 1-3 4-5 7-5 4 0 8 3 8 8 0 11-15 20-15 20z" fill="currentColor" />
    </svg>
  );
}

export function Arrow(props: P) {
  return (
    <svg viewBox="0 0 90 60" {...base} aria-hidden {...props}>
      <path d="M6 10c20 0 46 8 58 36" />
      <path d="M52 40l12 8 4-14" />
    </svg>
  );
}

export function Scribble(props: P) {
  return (
    <svg viewBox="0 0 120 60" {...base} aria-hidden {...props}>
      <path d="M10 32c4-18 70-26 92-10 18 14-20 28-52 28S2 40 14 22c10-14 60-16 84-6" />
    </svg>
  );
}

export function Zigzag(props: P) {
  return (
    <svg viewBox="0 0 80 20" {...base} aria-hidden {...props}>
      <path d="M2 14l8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8" />
    </svg>
  );
}
