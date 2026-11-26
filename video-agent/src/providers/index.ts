import { mockProvider } from "./mock.js";
import { runwayProvider } from "./runway.js";
import type { ClipProvider } from "./types.js";
import { veoProvider } from "./veo.js";

export const PROVIDER_NAMES = ["mock", "runway", "veo"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export function pickProvider(name: string | undefined): ClipProvider {
  const chosen = (name ?? process.env.VIDEO_PROVIDER ?? "mock") as ProviderName;
  switch (chosen) {
    case "mock":
      return mockProvider;
    case "runway":
      return runwayProvider();
    case "veo":
      return veoProvider();
    default:
      throw new Error(`Unknown VIDEO_PROVIDER "${chosen}". Use one of: ${PROVIDER_NAMES.join(", ")}`);
  }
}

export type { ClipProvider } from "./types.js";
