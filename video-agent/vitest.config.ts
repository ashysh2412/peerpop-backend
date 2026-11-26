import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // ffmpeg renders are slow-ish; the pipeline test makes real mp4s.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
