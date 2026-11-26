export const ASPECTS = ["9:16", "16:9", "1:1"] as const;
export type Aspect = (typeof ASPECTS)[number];

/** Output canvas for each aspect. Clips are scaled to cover it and centre-cropped. */
export function canvasFor(aspect: Aspect): { width: number; height: number } {
  switch (aspect) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "16:9":
      return { width: 1920, height: 1080 };
    case "1:1":
      return { width: 1080, height: 1080 };
  }
}

export type ClipRequest = {
  prompt: string;
  negativePrompt?: string;
  durationSeconds: number;
  aspect: Aspect;
  /** Ask the model for sound (ambience, foley). Not every model can. */
  audio: boolean;
  seed?: number;
  outPath: string;
};

export type ClipResult = {
  path: string;
  model: string;
  /** Duration the provider actually produced, if known before probing. */
  durationSeconds?: number;
  audio: boolean;
  costNote?: string;
};

export type VoiceoverRequest = { text: string; voice?: string; outPath: string };
export type MusicRequest = { prompt: string; durationSeconds: number; instrumental: boolean; outPath: string };

export interface ClipProvider {
  readonly name: string;
  /** Durations the model accepts, so requests can be snapped; undefined means any integer. */
  readonly durations?: readonly number[];
  generateClip(req: ClipRequest): Promise<ClipResult>;
  generateVoiceover?(req: VoiceoverRequest): Promise<{ path: string; model: string }>;
  generateMusic?(req: MusicRequest): Promise<{ path: string; model: string }>;
}

/** Picks the closest allowed duration (ties go up, so a 5s ask becomes 6s and not 4s). */
export function snapDuration(wanted: number, allowed: readonly number[] | undefined, fallbackMax = 10) {
  if (!allowed?.length) return Math.min(fallbackMax, Math.max(2, Math.round(wanted)));
  return [...allowed].sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || b - a)[0];
}
