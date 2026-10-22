import { describe, expect, it } from "vitest";
import { firstName, parseInvitees } from "./invites";

describe("parseInvitees", () => {
  it("reads names and emails from pasted table rows", () => {
    const text = "Name\tEmail\tRole\nAsha Rao\tAsha@Example.com\tCREATOR\nRavi\travi@example.in\tCOMPANY";
    expect(parseInvitees(text)).toEqual([
      { email: "asha@example.com", name: "Asha Rao" },
      { email: "ravi@example.in", name: "Ravi" },
    ]);
  });

  it("handles plain lists, commas and duplicates", () => {
    expect(parseInvitees("a@x.com, b@y.co.in\nA@X.com")).toEqual([
      { email: "a@x.com", name: null },
      { email: "b@y.co.in", name: null },
    ]);
  });

  it("drops row numbers and stray symbols around the name", () => {
    expect(parseInvitees("12  Priya S.  priya@ex.com  PENDING")).toEqual([{ email: "priya@ex.com", name: "Priya S." }]);
  });

  it("ignores text with no email", () => {
    expect(parseInvitees("Waitlist\nTotal 40")).toEqual([]);
  });

  it("gives the first name", () => {
    expect(firstName("Asha Rao")).toBe("Asha");
    expect(firstName(null)).toBeNull();
  });
});
