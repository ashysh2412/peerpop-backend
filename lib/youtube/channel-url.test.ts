import { describe, expect, it } from "vitest";
import { parseChannelUrl } from "./channel-url";

describe("parseChannelUrl", () => {
  it.each([
    "https://www.youtube.com/@MrBeast",
    "youtube.com/@MrBeast/videos",
    "m.youtube.com/@MrBeast?si=x",
    "@MrBeast",
  ])("reads a handle from %s", (input) => {
    expect(parseChannelUrl(input)).toEqual({ by: "handle", value: "MrBeast" });
  });

  it("reads a channel id", () => {
    expect(parseChannelUrl("https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA/featured")).toEqual({
      by: "id",
      value: "UCX6OQ3DkcsbYNE6H8uQQuVA",
    });
  });

  it("reads a legacy username", () => {
    expect(parseChannelUrl("youtube.com/user/PewDiePie")).toEqual({ by: "username", value: "PewDiePie" });
  });

  it.each([
    "https://www.youtube.com/c/SomeName",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/channel/not-an-id",
    "https://example.com/@MrBeast",
    "youtube.com",
    "not a link",
  ])("rejects %s", (input) => {
    expect(parseChannelUrl(input)).toBeNull();
  });
});
