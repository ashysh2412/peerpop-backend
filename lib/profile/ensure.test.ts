import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { startingName } = await import("./ensure");

describe("startingName", () => {
  it("uses the Google name when there is one", () => {
    expect(startingName({ email: "x@y.com", user_metadata: { full_name: "Riya Sharma" } })).toBe("Riya Sharma");
  });

  it("falls back to the email, tidied up", () => {
    expect(startingName({ email: "riya.sharma99@gmail.com", user_metadata: {} })).toBe("Riya Sharma");
    expect(startingName({ email: "1234@gmail.com", user_metadata: {} })).toBe("New creator");
  });
});
