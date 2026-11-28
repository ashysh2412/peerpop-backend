import { describe, expect, it } from "vitest";
import { acceptedChatMessage } from "./accept-chat";

describe("acceptedChatMessage", () => {
  it("is short, uses first names and is signed Team Peerpop", () => {
    const text = acceptedChatMessage("Priya Shah", "Aman Singh", "Street food reel");
    expect(text).toContain('Priya accepted Aman for the collab "Street food reel"');
    expect(text.trim().endsWith("Team Peerpop")).toBe(true);
    expect(text.split("\n").length).toBeLessThanOrEqual(5);
  });
});
