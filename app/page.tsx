import { ArrowRight, BadgeCheck, Handshake, MapPin, Search, Sparkles, Users } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Search,
    title: "Find the right creator",
    text: "Search by city, niche, audience size, skills and language. Every result shows real numbers.",
  },
  {
    icon: BadgeCheck,
    title: "Verified YouTube stats",
    text: "Subscribers, average views and growth come straight from YouTube, refreshed every day.",
  },
  {
    icon: Users,
    title: "Build your network",
    text: "Connect like on LinkedIn. Contact details unlock only when both of you say yes.",
  },
  {
    icon: Handshake,
    title: "Team up on collabs",
    text: "Post an idea, like a Marathi anchor for a food series, and pick from creators who raise a hand.",
  },
];

const SAMPLE = [
  { name: "Riya Kulkarni", niche: "Food", city: "Pune", subs: "128K", grad: "from-orange-400 to-rose-500" },
  { name: "Arjun Mehta", niche: "Tech", city: "Mumbai", subs: "54K", grad: "from-sky-400 to-indigo-500" },
  { name: "Sana Shaikh", niche: "Fashion", city: "Pune", subs: "212K", grad: "from-fuchsia-400 to-violet-600" },
];

// Signed-in visitors are sent to /home by proxy.ts, so this page stays static.
export default function LandingPage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(139,92,246,0.18),transparent),radial-gradient(40%_40%_at_90%_10%,rgba(244,114,182,0.16),transparent)]" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <span className="chip-brand self-start px-3 py-1.5 text-[13px]">
              <Sparkles size={14} /> Now live in Pune
            </span>
            <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Where Indian creators{" "}
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
                find their next collab
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted">
              Show your best work, verify your YouTube channel, connect with creators near you, and team up on your next
              shoot.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary btn-lg">
                Join Peerpop, it&apos;s free <ArrowRight size={18} />
              </Link>
              <Link href="/creators" className="btn-secondary btn-lg">
                Browse creators
              </Link>
            </div>
          </div>

          {/* A taste of what search results look like (made-up examples). */}
          <div className="relative mx-auto w-full max-w-sm" aria-hidden>
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 blur-2xl" />
            <p className="mb-3 text-center text-xs font-medium tracking-wide text-muted uppercase">Example profiles</p>
            <div className="flex flex-col gap-3">
              {SAMPLE.map((c, i) => (
                <div
                  key={c.name}
                  className={`card flex items-center gap-3 p-4 shadow-lg ${i === 1 ? "sm:translate-x-6" : ""}`}
                >
                  <div className={`h-12 w-12 shrink-0 rounded-full bg-gradient-to-br ${c.grad}`} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-semibold">
                      {c.name} <BadgeCheck size={16} className="text-brand" />
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <MapPin size={12} /> {c.city} · {c.niche}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{c.subs}</p>
                    <p className="text-[11px] text-muted">subscribers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card flex flex-col gap-3 p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon size={22} />
            </span>
            <h2 className="font-bold">{title}</h2>
            <p className="text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your next collab is one connection away.</h2>
            <p className="mt-2 text-white/80">Set up your profile in two minutes. Sign in with Google or email.</p>
          </div>
          <Link href="/login" className="btn btn-lg bg-white text-violet-700 hover:bg-violet-50">
            Get started <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
