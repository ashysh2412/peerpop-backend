import { ArrowRight, BadgeCheck, Bell, Check, ChevronDown, Handshake, Lock, MapPin, Search, Sparkles, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NICHES, SKILLS } from "@/lib/catalog";

// Everything on this page is a made-up example of what the app shows, not real accounts.
const TILES = [
  { name: "Riya", niche: "Food", subs: "128K", grad: "from-[#2e8bff] to-[#5b4dff]" },
  { name: "Arjun", niche: "Tech", subs: "54K", grad: "from-[#5b4dff] to-[#b04dff]" },
  { name: "Sana", niche: "Fashion", subs: "212K", grad: "from-[#b04dff] to-[#2e8bff]" },
];

const STEPS = [
  { title: "Make your profile", text: "Add your skills, niche, city and the languages you shoot in. It takes two minutes." },
  { title: "Show your work", text: "Pin your best videos and photos, and verify your YouTube channel for real numbers." },
  { title: "Find your people", text: "Search creators near you and send a connect request with a short note." },
  { title: "Start a collab", text: "Post what you're planning and who you need, or raise your hand on someone else's." },
];

const FAQ = [
  {
    q: "Who can join Peerpop?",
    a: "Any creator in India: YouTubers, Instagram creators, anchors, editors, scriptwriters, videographers, photographers and voiceover artists. We started in Pune and you can join from any of 181 cities.",
  },
  { q: "Is it free?", a: "Yes. Creating a profile, searching, connecting and posting collabs are all free." },
  {
    q: "How are YouTube stats verified?",
    a: "You add a short code to your channel description, and we confirm you own the channel. After that, subscribers and average views come straight from YouTube and refresh every day.",
  },
  {
    q: "What about Instagram?",
    a: "You can add your Instagram today, and the numbers show as self-reported. Verified Instagram stats come once Meta approves our app.",
  },
  {
    q: "Who sees my phone number or email?",
    a: "Only creators you've connected with. Your contact details stay hidden until both of you accept the connection.",
  },
  {
    q: "How do collabs work?",
    a: "Post an idea, like a Marathi anchor for a food series. Creators with that skill or in your city get an alert, raise a hand, and you pick who to work with.",
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold tracking-[0.14em] text-brand uppercase">{children}</p>;
}

function Feature({
  eyebrow,
  title,
  text,
  points,
  visual,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={`flex flex-col gap-4 ${flip ? "lg:order-2" : ""}`}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{title}</h3>
        <p className="text-lg leading-relaxed text-muted">{text}</p>
        <ul className="flex flex-col gap-2.5 pt-1">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px]">
              <span className="bg-brand-gradient mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white">
                <Check size={12} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={`relative ${flip ? "lg:order-1" : ""}`} aria-hidden>
        <div className="bg-brand-gradient absolute -inset-4 -z-10 rounded-[2.5rem] opacity-10 blur-2xl" />
        <div className="rounded-[2rem] border border-line bg-surface p-5 sm:p-8">{visual}</div>
      </div>
    </div>
  );
}

function ProfileMock() {
  return (
    <div className="card flex flex-col gap-4 p-5 shadow-xl">
      <div className="flex items-center gap-4">
        <span className="bg-brand-gradient rounded-full p-[3px]">
          <span className="block rounded-full bg-card p-[3px]">
            <span className="block h-16 w-16 rounded-full bg-gradient-to-br from-[#2e8bff] to-[#b04dff]" />
          </span>
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-lg font-semibold">
            Riya Kulkarni <BadgeCheck size={18} className="text-brand" />
          </p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} /> Pune · Food, Travel
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Anchor", "Editor", "Scriptwriter"].map((s) => (
          <span key={s} className="bg-brand-gradient rounded-full px-3 py-1 text-xs font-semibold text-white">
            {s}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-line rounded-2xl bg-sunken py-3 text-center">
        {[
          ["128K", "subscribers"],
          ["22K", "avg views"],
          ["2/wk", "uploads"],
        ].map(([n, l]) => (
          <div key={l}>
            <p className="text-lg font-semibold">{n}</p>
            <p className="text-[11px] text-muted">{l}</p>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <BadgeCheck size={14} className="text-brand" /> Verified with YouTube · updated today
      </p>
    </div>
  );
}

function WorkMock() {
  return (
    <div className="card flex flex-col gap-4 p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Work</p>
        <span className="text-xs font-semibold text-brand">+ Add video</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {["from-[#2e8bff] to-[#5b4dff]", "from-[#5b4dff] to-[#b04dff]", "from-[#b04dff] to-[#2e8bff]", "from-[#2e8bff] to-[#b04dff]"].map((g, i) => (
          <div key={g} className={`relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br ${g}`}>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs text-white ${i % 2 ? "bg-black/40" : "bg-red-600"}`}>▶</span>
            </span>
          </div>
        ))}
      </div>
      <p className="font-semibold">Photos</p>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-[#efefff] to-[#e3dcff]" />
        ))}
      </div>
    </div>
  );
}

function SearchMock() {
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center gap-2 px-4 py-3 text-sm text-muted shadow-lg">
        <Search size={16} /> Anchors in Pune who speak Marathi
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Pune", "Anchor", "Marathi", "Open to collab"].map((c, i) => (
          <span key={c} className={`rounded-full px-3 py-1 text-xs font-semibold ${i < 3 ? "bg-ink text-white" : "border border-line bg-card"}`}>
            {c}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {TILES.map((t) => (
          <div key={t.name} className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${t.grad} shadow-lg`}>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 text-white">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-[11px] opacity-85">
                {t.niche} · {t.subs}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollabMock() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-brand-gradient rounded-3xl p-[2px] shadow-xl">
        <div className="flex flex-col gap-3 rounded-[22px] bg-card p-5">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-brand uppercase">
            <Handshake size={15} /> Collab call
          </p>
          <p className="text-xl leading-snug font-semibold tracking-tight">Looking for a Marathi anchor for a food series</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip-brand">Needs anchor</span>
            <span className="chip-brand">Needs editor</span>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <MapPin size={12} /> Pune · shoot on 8 Nov
            </span>
            <span className="btn-primary btn-sm">I&apos;m in</span>
          </div>
        </div>
      </div>
      <div className="card ml-auto flex w-[85%] items-center gap-3 p-3 shadow-lg">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Bell size={16} />
        </span>
        <p className="text-sm">
          <b>New collab in Pune</b> needs an anchor, like you.
        </p>
      </div>
    </div>
  );
}

function NetworkMock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="card flex items-center gap-3 p-4 shadow-lg">
        <span className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#5b4dff] to-[#b04dff]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Arjun Mehta</p>
          <p className="truncate text-xs text-muted">&ldquo;Loved your misal video. Want to do a tech x food episode?&rdquo;</p>
        </div>
        <span className="btn-primary btn-sm">
          <UserPlus size={14} /> Accept
        </span>
      </div>
      <div className="card flex items-center gap-3 p-4 shadow-lg">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Lock size={18} />
        </span>
        <div>
          <p className="font-semibold">Contact unlocked</p>
          <p className="text-xs text-muted">WhatsApp and email show only after you both say yes.</p>
        </div>
      </div>
    </div>
  );
}

// Signed-in visitors are sent to /home by proxy.ts, so this page stays static.
export default function LandingPage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,var(--glow-1),transparent),radial-gradient(40%_40%_at_90%_10%,var(--glow-2),transparent)]" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <span className="chip-brand self-start px-3 py-1.5 text-[13px]">
              <Sparkles size={14} /> Now live in Pune · free for creators
            </span>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              Where creators <span className="bg-brand-gradient bg-clip-text text-transparent">find their next collab</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted">
              Peerpop is the network for Indian creators. Show your best work, prove your numbers, meet creators near you and team up on your next shoot.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary btn-lg">
                Join Peerpop free <ArrowRight size={18} />
              </Link>
              <Link href="/creators" className="btn-secondary btn-lg">
                Browse creators
              </Link>
            </div>
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {["Sign in with Google or email", "No fees", "Contact shared only on yes"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={14} className="text-brand" /> {t}
                </span>
              ))}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm" aria-hidden>
            <div className="bg-brand-gradient absolute -inset-6 -z-10 rounded-[2rem] opacity-15 blur-2xl" />
            <ProfileMock />
            <div className="card absolute -bottom-16 -left-4 flex items-center gap-3 p-3 pr-4 shadow-xl sm:-left-12">
              <span className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-full text-white">
                <Handshake size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold">3 creators raised a hand</p>
                <p className="text-xs text-muted">on your collab call</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-12 text-center">
          <Eyebrow>Whatever you create, you belong here</Eyebrow>
          <div className="flex flex-wrap justify-center gap-2">
            {SKILLS.map(([v, l]) => (
              <span key={v} className="bg-brand-gradient rounded-full px-4 py-2 text-sm font-semibold text-white">
                {l}s
              </span>
            ))}
            {NICHES.filter(([v]) => v !== "other").map(([v, l]) => (
              <span key={v} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold">
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-24 px-4 py-24">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
          <Eyebrow>What you can do on Peerpop</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Built for how creators actually team up</h2>
        </div>
        <Feature
          eyebrow="Profile"
          title="A portfolio that proves it"
          text="Your skills sit right under your name, with your best videos and photos below. Verify your YouTube channel and your numbers carry a badge."
          points={["Skills, niches and languages at the top", "Videos and photo grid of your work", "Subscribers and average views straight from YouTube"]}
          visual={<WorkMock />}
        />
        <Feature
          flip
          eyebrow="Discover"
          title="Find the right creator in seconds"
          text="Filter by city, niche, skill, language and audience size. Every result shows real numbers, so you know who you're talking to."
          points={["181 Indian cities, starting with Pune", "Filter by Marathi, Hindi or English", "See who is open to collab right now"]}
          visual={<SearchMock />}
        />
        <Feature
          eyebrow="Collabs"
          title="Post an idea, get hands raised"
          text="Say what you're shooting and who you need. Creators with that skill or in your city get an alert and can say they're in with one tap."
          points={["Alerts go to creators who fit", "Pick from the people who raise a hand", "Collabs that fit you show first on Home"]}
          visual={<CollabMock />}
        />
        <Feature
          flip
          eyebrow="Network"
          title="Connect without giving out your number"
          text="Send a connect request with a short note. Your WhatsApp and email unlock only when both of you say yes."
          points={["Requests with a personal note", "Contact details stay private until accepted", "A feed of what your connections are making"]}
          visual={<NetworkMock />}
        />
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-24">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">From sign-up to your first collab</h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-6">
                <span className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white">{i + 1}</span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto grid w-full max-w-6xl scroll-mt-20 gap-10 px-4 py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col gap-3">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Questions? Answers.</h2>
          <p className="text-muted">
            Anything else? Write to{" "}
            <a href="mailto:hello@peerpop.in" className="font-semibold text-brand hover:underline">
              hello@peerpop.in
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group card p-5 open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={18} className="shrink-0 text-muted transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
        <div className="bg-brand-gradient relative overflow-hidden rounded-[2rem] p-8 text-white sm:p-14">
          <Users size={220} className="absolute -right-10 -bottom-12 opacity-10" aria-hidden />
          <div className="relative flex max-w-2xl flex-col gap-5">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Your next collab is one connection away.</h2>
            <p className="text-lg text-white/85">Set up your profile in two minutes. Free, with Google or email.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-lg bg-white text-brand-ink hover:bg-white/90">
                Get started <ArrowRight size={18} />
              </Link>
              <Link href="/creators" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">
                Browse creators
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
