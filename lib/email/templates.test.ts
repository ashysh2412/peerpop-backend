import { describe, expect, it } from "vitest";
import { connectionRequestEmail, escapeHtml } from "./templates";

describe("connectionRequestEmail", () => {
  const base = { name: "Riya", handle: "riya_eats", city: "Pune", message: null, siteUrl: "https://peerpop.example" };

  it("links to the requests tab and the sender's profile", () => {
    const email = connectionRequestEmail(base);
    expect(email.subject).toBe("Riya wants to connect with you on Peerpop");
    expect(email.text).toContain("https://peerpop.example/network?tab=received");
    expect(email.html).toContain("https://peerpop.example/creators/riya_eats");
    expect(email.text).toContain("Riya (@riya_eats, Pune)");
  });

  it("escapes the sender's note in html", () => {
    const email = connectionRequestEmail({ ...base, message: "<script>hi</script>" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain('"<script>hi</script>"');
  });

  it("escapes quotes and ampersands", () => {
    expect(escapeHtml(`a & "b" 'c'`)).toBe("a &amp; &quot;b&quot; &#39;c&#39;");
  });
});
