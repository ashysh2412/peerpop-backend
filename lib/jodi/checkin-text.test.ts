import { describe, expect, it } from "vitest";
import { connectedCheckinDue, connectedCheckinMessage, nudgeDue, nudgeMessage, waitingNudgeMessage } from "./checkin-text";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("timing", () => {
  it("asks connected Jodis once, 48 hours after they connect", () => {
    expect(connectedCheckinDue(47 * HOUR, 0, false)).toBe(false);
    expect(connectedCheckinDue(48 * HOUR, 0, false)).toBe(true);
    expect(connectedCheckinDue(48 * HOUR, 0, true)).toBe(false);
    expect(connectedCheckinDue(8 * DAY, 0, false)).toBe(false);
  });
  it("nudges 3 days after a list only if nobody connected, once per list", () => {
    expect(nudgeDue(3 * DAY, 0, null, false)).toBe(true);
    expect(nudgeDue(3 * DAY, 0, null, true)).toBe(false);
    expect(nudgeDue(2 * DAY, 0, null, false)).toBe(false);
    expect(nudgeDue(4 * DAY, 0, 3 * DAY, false)).toBe(false);
    expect(nudgeDue(13 * DAY, 10 * DAY, 3 * DAY, false)).toBe(true);
  });
});

describe("messages", () => {
  it("asks connected Jodis if the collab is moving, with tap links and Team Peerpop", () => {
    const text = connectedCheckinMessage("Riya Sharma", "Sheta Halder");
    expect(text).toContain("Hi Riya 👋 Aap aur Sheta connect ho gaye! Collab aage badha?");
    for (const a of ["done", "talking", "stuck"]) expect(text).toContain(`www.peerpop.in/jodi/${a}`);
    expect(text).toContain("– Team Peerpop");
    expect(text).not.toContain("Ashish");
  });
  it("nudges people who haven't connected", () => {
    const text = nudgeMessage("Riya");
    expect(text).toContain("www.peerpop.in/jodi/waiting");
    expect(text).toContain("www.peerpop.in/jodi/later");
  });
  it("reminds the Jodi who hasn't accepted", () => {
    expect(waitingNudgeMessage("Sheta Halder", "Riya Sharma")).toContain("Hi Sheta 👋 Riya ne aapko collab request bheji hai.");
  });
});
