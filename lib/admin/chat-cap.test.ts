import { describe, expect, it } from "vitest";
import { canSendChat, countChats } from "./chat-cap";

describe("weekly chat limit", () => {
  it("counts the welcome and first Jodis sent together as one chat", () => {
    const counts = countChats([
      { recipient_id: "a", created_at: "2026-11-28T10:00:00Z" },
      { recipient_id: "a", created_at: "2026-11-28T10:00:05Z" },
      { recipient_id: "a", created_at: "2026-11-29T06:00:00Z" },
      { recipient_id: "b", created_at: "2026-11-28T10:00:00Z" },
    ]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
  });
  it("lets the welcome through always, check-ins and lists up to 3, nudges and idea matches up to 2", () => {
    expect(canSendChat(5, "welcome")).toBe(true);
    expect(canSendChat(2, "checkin")).toBe(true);
    expect(canSendChat(3, "list")).toBe(false);
    expect(canSendChat(1, "nudge")).toBe(true);
    expect(canSendChat(2, "nudge")).toBe(false);
    expect(canSendChat(2, "idea")).toBe(false);
  });
});
