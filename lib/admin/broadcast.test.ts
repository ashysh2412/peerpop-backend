import { describe, expect, it } from "vitest";
import { personalise, pickRecipients } from "./broadcast";

const people = [
  { id: "o", name: "Peerpop", handle: "peerpop", gaps: [] },
  { id: "a", name: "Asha Rao", handle: "asha", gaps: ["Photo"] },
  { id: "b", name: "Bo", handle: "bo", gaps: [] },
  { id: "c", name: "Cy", handle: null, gaps: ["Profile"] },
  { id: "d", name: "Dev", handle: "dev", gaps: ["Bio"] },
];

describe("pickRecipients", () => {
  it("skips the official account, people without a profile and people who blocked Peerpop", () => {
    expect(pickRecipients(people, "everyone", "o", new Set(["d"])).map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("incomplete means something is missing from the profile", () => {
    expect(pickRecipients(people, "incomplete", "o", new Set()).map((p) => p.id)).toEqual(["a", "d"]);
  });
});

describe("personalise", () => {
  it("uses the first name, or 'there'", () => {
    expect(personalise("Hi {name}! {Name} again", "Asha Rao")).toBe("Hi Asha! Asha again");
    expect(personalise("Hi {name}", null)).toBe("Hi there");
  });
});
