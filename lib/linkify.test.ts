import { describe, expect, it } from "vitest";
import { linkParts } from "./linkify";

describe("linkParts", () => {
  it("turns Peerpop links into in-app links", () => {
    expect(linkParts("See her profile: www.peerpop.in/sheta.")).toEqual([
      { text: "See her profile: " },
      { text: "www.peerpop.in/sheta", href: "/sheta", internal: true },
      { text: "." },
    ]);
    expect(linkParts("https://peerpop.in")[0]).toEqual({ text: "https://peerpop.in", href: "/", internal: true });
  });
  it("opens other links on the web", () => {
    expect(linkParts("watch https://youtu.be/x1 now")[1]).toEqual({ text: "https://youtu.be/x1", href: "https://youtu.be/x1" });
    expect(linkParts("www.example.com")[0].href).toBe("https://www.example.com");
  });
  it("never makes an in-app link that jumps to another site", () => {
    for (const t of ["www.peerpop.in//evil.com", "https://www.peerpop.in//evil.com/x", "https://peerpop.in/\\evil.com"]) {
      const link = linkParts(t).find((p) => p.href)!;
      expect(link.internal).toBeUndefined();
      expect(link.href).toMatch(/^https:\/\/(www\.)?peerpop\.in\//);
    }
  });

  it("leaves plain text alone", () => {
    expect(linkParts("no links here")).toEqual([{ text: "no links here" }]);
    expect(linkParts("peerpop.in.evil.com")).toEqual([{ text: "peerpop.in.evil.com" }]);
  });
});
