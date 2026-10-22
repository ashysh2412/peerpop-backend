import { describe, expect, it } from "vitest";
import { collabIdea, milestoneIdea, tipIdeas, weekKey } from "./ideas";

describe("Instagram ideas", () => {
  it("gives every tip a unique key and an Instagram-sized caption", () => {
    const tips = tipIdeas();
    expect(new Set(tips.map((t) => t.idea_key)).size).toBe(tips.length);
    for (const t of tips) {
      expect(t.caption.length).toBeLessThanOrEqual(2200);
      expect((t.caption.match(/#/g) ?? []).length).toBeLessThanOrEqual(30);
      expect(t.headline.length).toBeLessThanOrEqual(120);
    }
  });

  it("describes a collab call", () => {
    const idea = collabIdea({ id: "c1", title: "Cafe reel at Koregaon Park", roles: ["Editor", "Videographer"], city: "Pune" });
    expect(idea.idea_key).toBe("collab:c1");
    expect(idea.subline).toBe("Looking for: Editor, Videographer in Pune");
    expect(idea.caption).toContain("Cafe reel at Koregaon Park");
  });

  it("only celebrates a busy week", () => {
    expect(milestoneIdea(3, "2026-W43")).toBeNull();
    expect(milestoneIdea(12, "2026-W43")?.headline).toBe("12 new creators joined Peerpop this week");
  });

  it("labels weeks", () => {
    expect(weekKey(new Date("2026-10-22T10:00:00Z"))).toBe("2026-W43");
    expect(weekKey(new Date("2027-01-01T10:00:00Z"))).toBe("2026-W53");
  });
});
