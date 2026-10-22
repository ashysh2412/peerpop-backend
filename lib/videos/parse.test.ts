import { describe, expect, it } from "vitest";
import { embedUrl, parseVideoUrl } from "./parse";

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
    "https://example.com/video/123456",
  ])("rejects %s", (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});

describe("Drive and Vimeo links", () => {
  it.each([
    "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing",
    "drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
    "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345&export=download",
  ])("reads Google Drive link %s", (url) => {
    expect(parseVideoUrl(url)).toEqual({
      platform: "drive",
      externalId: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
      url: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view",
      thumbnailUrl: null,
    });
  });

  it("reads public and unlisted Vimeo links", () => {
    expect(parseVideoUrl("https://vimeo.com/76979871")).toMatchObject({ platform: "vimeo", externalId: "76979871" });
    expect(parseVideoUrl("https://vimeo.com/76979871/8272103f6e")).toMatchObject({
      externalId: "76979871/8272103f6e",
      url: "https://vimeo.com/76979871/8272103f6e",
    });
    expect(parseVideoUrl("https://player.vimeo.com/video/76979871?h=8272103f6e")?.externalId).toBe("76979871/8272103f6e");
  });

  it("builds the players", () => {
    expect(embedUrl("drive", "abc")).toBe("https://drive.google.com/file/d/abc/preview");
    expect(embedUrl("vimeo", "76979871/8272103f6e")).toBe("https://player.vimeo.com/video/76979871?autoplay=1&h=8272103f6e");
    expect(embedUrl("instagram", "x")).toBeNull();
  });

  it("rejects Drive folders and Vimeo channels", () => {
    expect(parseVideoUrl("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345")).toBeNull();
    expect(parseVideoUrl("https://vimeo.com/channels/staffpicks")).toBeNull();
  });
});
