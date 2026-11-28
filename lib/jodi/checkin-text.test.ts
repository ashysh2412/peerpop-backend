import { describe, expect, it } from "vitest";
import { checkinDue, checkinMessage, waitingNudgeMessage } from "./checkin-text";

const DAY = 24 * 60 * 60 * 1000;

describe("checkinDue", () => {
  it("asks 3 to 7 days after a list, once", () => {
    expect(checkinDue(2 * DAY, 0, null)).toBe(false);
    expect(checkinDue(3 * DAY, 0, null)).toBe(true);
    expect(checkinDue(8 * DAY, 0, null)).toBe(false);
    expect(checkinDue(4 * DAY, 0, 3 * DAY)).toBe(false);
    expect(checkinDue(13 * DAY, 10 * DAY, 3 * DAY)).toBe(true);
  });
});

describe("messages", () => {
  it("has three tap links and the Team Peerpop sign-off", () => {
    const text = checkinMessage("Riya Sharma");
    expect(text).toContain("Hi Riya 👋 Jodi se baat hui?");
    for (const a of ["done", "waiting", "later"]) expect(text).toContain(`www.peerpop.in/jodi/${a}`);
    expect(text).toContain("– Team Peerpop");
    expect(text).not.toContain("Ashish");
  });
  it("reminds the Jodi who hasn't accepted", () => {
    expect(waitingNudgeMessage("Sheta Halder", "Riya Sharma")).toContain("Hi Sheta 👋 Riya ne aapko collab request bheji hai.");
  });
});
