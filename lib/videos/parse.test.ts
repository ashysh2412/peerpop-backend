import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./parse";

describe("parseVideoUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "youtube.com/embed/dQw4w9WgXcQ",
  ])("reads YouTube link %s", (url) => {
    expect(parseVideoUrl(url)).toEqual({
      platform: "youtube",
      externalId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    });
  });

  it("reads Instagram reels and posts", () => {
    expect(parseVideoUrl("https://www.instagram.com/reel/C9xYz12AbCd/?igsh=x")).toMatchObject({
      platform: "instagram",
      externalId: "C9xYz12AbCd",
      url: "https://www.instagram.com/reel/C9xYz12AbCd/",
    });
    expect(parseVideoUrl("instagram.com/reels/C9xYz12AbCd")?.url).toBe(
      "https://www.instagram.com/reel/C9xYz12AbCd/",
    );
    expect(parseVideoUrl("https://instagram.com/p/C9xYz12AbCd/")?.url).toBe(
      "https://www.instagram.com/p/C9xYz12AbCd/",
    );
  });

  it.each([
    "",
    "not a url",
    "https://www.youtube.com/@somechannel",
    "https://www.youtube.com/watch?v=short",
    "https://www.instagram.com/someuser/",
    "https://vimeo.com/123456",
  ])("rejects %s", (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});
