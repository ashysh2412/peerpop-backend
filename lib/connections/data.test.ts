import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { stateFor } = await import("./data");

const row = (over: object) => ({
  id: "c1",
  from_user: "me",
  to_user: "them",
  message: null,
  status: "pending" as const,
  created_at: "2026-10-01T00:00:00Z",
  responded_at: null,
  ...over,
});

describe("stateFor", () => {
  it("covers each side of a request", () => {
    expect(stateFor("me", null)).toEqual({ kind: "none" });
    expect(stateFor("me", row({}))).toEqual({ kind: "sent", id: "c1" });
    expect(stateFor("them", row({ message: "hi" }))).toEqual({ kind: "received", id: "c1", message: "hi" });
    expect(stateFor("them", row({ status: "accepted" }))).toEqual({ kind: "connected", id: "c1" });
  });

  it("makes the sender of a declined request wait 30 days", () => {
    const declined = row({ status: "declined", responded_at: "2026-10-01T00:00:00Z" });
    expect(stateFor("me", declined, Date.parse("2026-10-30T00:00:00Z"))).toEqual({ kind: "declined", id: "c1", canRetry: false });
    expect(stateFor("me", declined, Date.parse("2026-10-31T00:00:00Z"))).toEqual({ kind: "declined", id: "c1", canRetry: true });
    expect(stateFor("them", declined)).toEqual({ kind: "none" });
  });
});
