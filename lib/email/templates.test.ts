import { describe, expect, it } from "vitest";
import { connectionRequestEmail, escapeHtml, inviteEmail, simpleEmail } from "./templates";

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

describe("simpleEmail", () => {
  it("escapes everything people type", () => {
    const e = simpleEmail({
      lead: "<b>Riya</b> is interested",
      note: "a & b",
      button: { text: "Open", url: "https://peerpop.example/collabs/1" },
      reason: "Because.",
    });
    expect(e.html).toContain("&lt;b&gt;Riya&lt;/b&gt;");
    expect(e.html).toContain("a &amp; b");
    expect(e.text).toContain("Open: https://peerpop.example/collabs/1");
  });
});

describe("inviteEmail", () => {
  it("greets by name and links to sign-in", () => {
    const e = inviteEmail({ name: "<Asha>", siteUrl: "https://peerpop.in" });
    expect(e.text).toContain("Hi <Asha>,");
    expect(e.html).toContain("Hi &lt;Asha&gt;,");
    expect(e.html).toContain('href="https://peerpop.in/login"');
  });

  it("works without a name", () => {
    expect(inviteEmail({ name: null, siteUrl: "https://peerpop.in" }).text.startsWith("Hi,")).toBe(true);
  });
});
