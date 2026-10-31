import { describe, expect, it } from "vitest";
import { digestLines } from "./digest-lines";

describe("digestLines", () => {
  it("lists counts biggest first with the right plural", () => {
    expect(digestLines({ post_like: 1, post_comment: 3, messages: 2 })).toEqual([
      "3 new comments on your posts",
      "2 unread messages",
      "1 new like on your posts",
    ]);
  });

  it("leaves out zeros", () => {
    expect(digestLines({ post_like: 0, new_member: 0 })).toEqual([]);
  });
});
