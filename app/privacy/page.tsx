import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy · Peerpop" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="20 October 2026">
      <p>
        Peerpop helps content creators in India find each other and collaborate. This page explains what we collect,
        why, and the choices you have. Questions? Write to <a className="text-violet-600" href="mailto:hello@peerpop.in">hello@peerpop.in</a>.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Your email address, and your name and photo if you sign in with Google.</li>
        <li>What you add to your profile: name, photo, bio, city, niches, skills, languages, social links and videos.</li>
        <li>Contact details you choose to share (email, WhatsApp, a note). These are shown only to people you connect with.</li>
        <li>
          Public YouTube channel numbers (subscribers, views, uploads) once you verify your channel. We read only
          public data through the YouTube API and never get access to your YouTube account.
        </li>
        <li>Your connection requests and connections, and the notifications we send you about them.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To show your profile and let other creators find you in search, if you choose to be listed.</li>
        <li>To verify that a YouTube channel belongs to you and keep its numbers up to date daily.</li>
        <li>To email you about connection requests and other activity on your account.</li>
        <li>To keep Peerpop safe, for example by limiting spam requests.</li>
      </ul>
      <p>We don&apos;t sell your data and we don&apos;t show ads.</p>
      <h2>Who we share it with</h2>
      <p>
        We use a few providers to run Peerpop: Supabase (database and sign-in), Vercel (hosting), Resend (email) and
        Google (sign-in and YouTube data). They process data only to provide their service to us. Our use of
        information received from Google APIs follows the{" "}
        <a className="text-violet-600" href="https://developers.google.com/terms/api-services-user-data-policy">
          Google API Services User Data Policy
        </a>
        , including its Limited Use requirements.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>Turn off &quot;Show my profile in search&quot; at any time to hide your profile.</li>
        <li>Edit or remove anything on your profile, and remove your YouTube channel, from Edit profile.</li>
        <li>
          To delete your account and its data, email <a className="text-violet-600" href="mailto:hello@peerpop.in">hello@peerpop.in</a>{" "}
          from the address you sign in with. We delete it within 30 days.
        </li>
      </ul>
      <h2>Keeping data safe</h2>
      <p>
        Data is stored with Supabase and protected by access rules so people only see what they are allowed to. YouTube
        numbers stop showing as verified if we can&apos;t refresh them for 7 days.
      </p>
      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date above and tell you by email for any important change.</p>
    </LegalPage>
  );
}
