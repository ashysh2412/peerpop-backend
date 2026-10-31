import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/data", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({}));
vi.mock("./send", () => ({}));

const { profileNudgeEmail } = await import("./profile-nudge");

describe("profileNudgeEmail", () => {
  it("greets by first name and lists only what's missing", () => {
    const e = profileNudgeEmail({ name: "Joel Jose", gaps: ["City", "Skills"], unsubscribe: "https://x/u" });
    expect(e.text.startsWith("Hi Joel,")).toBe(true);
    expect(e.text).toContain("- City\n- Skills");
    expect(e.text).not.toContain("- Photo");
    expect(e.html).toContain("https://x/u");
  });

  it("escapes names", () => {
    expect(profileNudgeEmail({ name: "<b>", gaps: ["Bio"], unsubscribe: "u" }).html).toContain("&lt;b&gt;");
  });
});
