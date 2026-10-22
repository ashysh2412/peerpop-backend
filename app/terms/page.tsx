import type { Metadata } from "next";
import { GrievanceSection } from "@/components/grievance-section";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms · Peerpop" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="22 October 2026">
      <p>
        These terms apply when you use Peerpop. By creating an account you agree to them. Questions? Write to{" "}
        <a className="text-brand-ink" href="mailto:hello@peerpop.in">hello@peerpop.in</a>.
      </p>
      <h2>Your account</h2>
      <ul>
        <li>You must be at least 18, or have a parent or guardian&apos;s permission.</li>
        <li>Use your real identity. Don&apos;t pretend to be another creator or brand.</li>
        <li>Only verify YouTube channels you own or manage.</li>
        <li>Numbers you enter yourself (marked &quot;self-reported&quot;) must be honest.</li>
      </ul>
      <h2>Using Peerpop</h2>
      <ul>
        <li>Be respectful. No harassment, hate, threats, or sexual content.</li>
        <li>No spam, mass connection requests, scams, or selling followers or views.</li>
        <li>Contact details you see after connecting are for collaboration only. Don&apos;t share or sell them.</li>
        <li>
          Nothing illegal: nothing that promotes terrorism or violence, threatens India&apos;s unity, security or public
          order, harms children, infringes someone&apos;s copyright, or impersonates someone.
        </li>
      </ul>
      <p>
        We may remove content or suspend accounts that break these rules. When the law requires it, we share account
        information and messages with law enforcement agencies.
      </p>
      <h2>Your content</h2>
      <p>
        You own what you post. You let us show it on Peerpop so other creators can see it. You can remove it at any
        time.
      </p>
      <h2>Collaborations</h2>
      <p>
        Peerpop helps creators meet. Any collab, payment or agreement is between the creators involved, and Peerpop is
        not a party to it.
      </p>
      <h2>The service</h2>
      <p>
        Peerpop is provided as it is while we build it, and features may change. We aren&apos;t responsible for losses
        caused by other users or by outages, to the extent the law allows. These terms follow the laws of India, and
        courts in Pune have jurisdiction.
      </p>
      <GrievanceSection />
      <h2>Changes</h2>
      <p>If we change these terms, we&apos;ll update the date above and tell you by email for any important change.</p>
    </LegalPage>
  );
}
