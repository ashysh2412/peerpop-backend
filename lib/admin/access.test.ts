import { describe, expect, it } from "vitest";
import { isAdminEmail } from "./access";

describe("isAdminEmail", () => {
  it("matches any listed email, ignoring case and spaces", () => {
    expect(isAdminEmail("Boss@Example.com", " other@x.com , boss@example.com ")).toBe(true);
  });
  it("lets nobody in when the setting is empty", () => {
    expect(isAdminEmail("boss@example.com", "")).toBe(false);
    expect(isAdminEmail(undefined, "boss@example.com")).toBe(false);
  });
  it("needs an exact match", () => {
    expect(isAdminEmail("boss@example.co", "boss@example.com")).toBe(false);
  });
});
