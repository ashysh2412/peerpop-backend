// Captions are burned in as ASS subtitles (libass wraps long lines and handles any Unicode).
import { canvasFor, type Aspect } from "./providers/types.js";

export type CaptionCue = { start: number; end: number; text: string };
export type CaptionStyle = {
  /** Where the text sits. "low" stays clear of Instagram/TikTok UI; "center" is for hooks. */
  position: "low" | "center" | "high";
  /** Font family name as libass sees it (must match the font files in fontsDir). */
  fontName: string;
  /** Font size as a fraction of the canvas height. */
  sizeFraction: number;
  primaryColor: string; // ASS &HBBGGRR&
  outlineColor: string;
  uppercase: boolean;
};

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  position: "low",
  fontName: "Inter",
  sizeFraction: 0.042,
  primaryColor: "&H00FFFFFF&",
  outlineColor: "&H00000000&",
  uppercase: false,
};

export function assTime(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(Math.min(99, cs)).padStart(2, "0")}`;
}

export function assEscape(text: string) {
  return text.replace(/[{}]/g, "").replace(/\r?\n/g, "\\N").trim();
}

export function buildAss(cues: CaptionCue[], aspect: Aspect, style: Partial<CaptionStyle> = {}) {
  const st = { ...DEFAULT_CAPTION_STYLE, ...style };
  const { width, height } = canvasFor(aspect);
  const fontSize = Math.round(height * st.sizeFraction);
  const alignment = st.position === "center" ? 5 : st.position === "high" ? 8 : 2; // numpad layout
  const marginV = st.position === "center" ? 0 : Math.round(height * (aspect === "9:16" ? 0.17 : 0.08));
  const marginH = Math.round(width * 0.08);
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Caption,${st.fontName},${fontSize},${st.primaryColor},&H000000FF&,${st.outlineColor},&H80000000&,-1,0,0,0,100,100,0,0,1,${Math.max(2, Math.round(fontSize * 0.08))},${Math.max(1, Math.round(fontSize * 0.04))},${alignment},${marginH},${marginH},${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const lines = cues
    .filter((c) => c.text.trim() && c.end > c.start)
    .map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Caption,,0,0,0,,${assEscape(st.uppercase ? c.text.toUpperCase() : c.text)}`);
  return [...header, ...lines, ""].join("\n");
}
