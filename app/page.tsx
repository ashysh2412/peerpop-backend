import { ArrowRight, BadgeCheck, Bell, Check, ChevronDown, Handshake, Lock, MapPin, Search, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow, Heart, Scribble, Sparks, Squiggle, Star, Zigzag } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { NICHES, POPULAR_NICHES, SKILLS } from "@/lib/catalog";

// The characters in /public/characters are Open Peeps by Pablo Stanley (CC0), drawn with DiceBear.
// Names and numbers on this page are made-up examples, not real accounts.
type Who = "riya" | "arjun" | "sana" | "kabir" | "neha" | "om" | "isha" | "rohan" | "dev" | "meera";

function Peep({ who, size, className = "" }: { who: Who; size: number; className?: string }) {
  return <Image src={`/characters/${who}.svg`} alt="" width={size} height={size} unoptimized className={className} />;
}

/** A character in a round sticker, for avatars. */
function Face({ who, size, bg = "bg-pop-lilac" }: { who: Who; size: number; bg?: string }) {
  return (
    <span className={`flex shrink-0 items-end justify-center overflow-hidden rounded-full border-2 border-ink ${bg}`} style={{ width: size, height: size }}>
      <Peep who={who} size={size} />
    </span>
  );
}

function Bubble({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`absolute rounded-2xl border-2 border-ink bg-card px-3 py-1.5 font-hand text-xl leading-none font-bold whitespace-nowrap shadow-[3px_3px_0_var(--ink)] ${className}`}
    >
      {children}
    </span>
  );
}

const TYPES: { label: string; who: Who; bg: string }[] = [
  { label: "Anchors", who: "riya", bg: "bg-pop-yellow" },
  { label: "Editors", who: "arjun", bg: "bg-pop-sky" },
  { label: "Comedians", who: "om", bg: "bg-pop-coral" },
  { label: "Videographers", who: "kabir", bg: "bg-pop-mint" },
  { label: "Photographers", who: "neha", bg: "bg-pop-lilac" },
  { label: "Food creators", who: "isha", bg: "bg-pop-yellow" },
  { label: "Musicians", who: "rohan", bg: "bg-pop-sky" },
  { label: "Fashion creators", who: "sana", bg: "bg-pop-coral" },
  { label: "Scriptwriters", who: "dev", bg: "bg-pop-mint" },
  { label: "Voiceover artists", who: "meera", bg: "bg-pop-lilac" },
];

const STEPS = [
  {
    title: "Make your profile",
    text: "Add your skills, niche, city and the languages you shoot in. It takes two minutes.",
    bg: "bg-pop-yellow",
    tilt: "-rotate-2",
  },
  { title: "Show your work", text: "Pin your best videos and photos, and verify your YouTube channel for real numbers.", bg: "bg-pop-sky", tilt: "rotate-1" },
  { title: "Find your people", text: "Search creators near you and send a connect request with a short note.", bg: "bg-pop-mint", tilt: "-rotate-1" },
  { title: "Start a collab", text: "Post what you're planning and who you need, or raise your hand on someone else's.", bg: "bg-pop-coral", tilt: "rotate-2" },
];

const FAQ = [
  {
    q: "Who can join Peerpop?",
    a: "Any creator in India: YouTubers, Instagram creators, anchors, editors, scriptwriters, videographers, photographers and voiceover artists. You can join from any of 181 cities.",
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
  return <p className="font-hand text-2xl font-bold text-brand-ink">{children}</p>;
}

function Feature({
  eyebrow,
  title,
  text,
  points,
  visual,
  note,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  visual: ReactNode;
  note: string;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <Reveal from={flip ? "right" : "left"} className={`flex flex-col gap-4 ${flip ? "lg:order-2" : ""}`}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{title}</h3>
        <p className="text-lg leading-relaxed text-muted">{text}</p>
        <ul className="flex flex-col gap-2.5 pt-1">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-pop-mint">
                <Check size={11} strokeWidth={3.5} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal from={flip ? "left" : "right"} delay={120} className={`relative ${flip ? "lg:order-1" : ""}`}>
        <div aria-hidden className="relative">
          <div className={`absolute inset-0 rounded-[2rem] border-2 border-ink ${flip ? "rotate-2 bg-pop-yellow" : "-rotate-2 bg-pop-lilac"}`} />
          <div className="relative rounded-[2rem] border-2 border-ink bg-card p-5 transition duration-300 hover:-translate-y-1 hover:rotate-[-0.5deg] sm:p-7">
            {visual}
          </div>
          <p
            className={`absolute -top-9 flex items-center gap-1 font-hand text-2xl font-bold text-ink ${flip ? "-left-2 sm:-left-6" : "-right-2 sm:-right-6"}`}
          >
            {note}
            <Arrow className={`h-8 w-12 text-brand-ink ${flip ? "" : "-scale-x-100"}`} />
          </p>
        </div>
      </Reveal>
    </div>
  );
}

function ProfileMock() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Face who="riya" size={72} bg="bg-pop-yellow" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-lg font-semibold">
            Riya Kulkarni <BadgeCheck size={18} className="text-brand-ink" />
          </p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} /> Pune · Food, Travel
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Anchor", "Editor", "Scriptwriter"].map((s, i) => (
          <span key={s} className={`rounded-full border-2 border-ink px-3 py-0.5 text-xs font-bold ${["bg-pop-coral", "bg-pop-sky", "bg-pop-mint"][i]}`}>
            {s}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x-2 divide-dashed divide-line rounded-2xl border-2 border-ink py-3 text-center">
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
        <BadgeCheck size={14} className="text-brand-ink" /> Verified with YouTube · updated today
      </p>
    </div>
  );
}

function SearchMock() {
  const tiles: { who: Who; name: string; meta: string; bg: string; tilt: string }[] = [
    { who: "meera", name: "Meera", meta: "Anchor · 128K", bg: "bg-pop-yellow", tilt: "-rotate-3" },
    { who: "dev", name: "Dev", meta: "Anchor · 54K", bg: "bg-pop-sky", tilt: "rotate-2" },
    { who: "sana", name: "Sana", meta: "Anchor · 212K", bg: "bg-pop-coral", tilt: "-rotate-1" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-2xl border-2 border-ink px-4 py-3 text-sm text-muted">
        <Search size={16} /> Anchors in Pune who shoot in Marathi
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Pune", "Anchor", "Marathi", "Open to collab"].map((c, i) => (
          <span key={c} className={`rounded-full border-2 border-ink px-3 py-0.5 text-xs font-bold ${i < 3 ? "bg-ink text-white" : "bg-card"}`}>
            {c}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        {tiles.map((t) => (
          <div key={t.name} className={`${t.tilt} overflow-hidden rounded-2xl border-2 border-ink ${t.bg} transition hover:rotate-0`}>
            <Peep who={t.who} size={160} className="h-auto w-full" />
            <div className="border-t-2 border-ink bg-card px-2.5 py-2">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-[11px] text-muted">{t.meta}</p>
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
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-ink bg-pop-yellow/40 p-5">
        <p className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
          <Handshake size={15} /> Collab call
        </p>
        <p className="text-xl leading-snug font-semibold tracking-tight">Looking for a Marathi anchor for a food series</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border-2 border-ink bg-card px-3 py-0.5 text-xs font-bold">Needs anchor</span>
          <span className="rounded-full border-2 border-ink bg-card px-3 py-0.5 text-xs font-bold">Needs editor</span>
        </div>
        <div className="flex items-center justify-between border-t-2 border-dashed border-ink/30 pt-3">
          <div className="flex -space-x-3">
            {(["kabir", "neha", "meera"] as Who[]).map((w, i) => (
              <Face key={w} who={w} size={36} bg={["bg-pop-mint", "bg-pop-sky", "bg-pop-coral"][i]} />
            ))}
          </div>
          <span className="btn-primary btn-sm">I&apos;m in 🙋</span>
        </div>
      </div>
      <div className="ml-auto flex w-[88%] rotate-1 items-center gap-3 rounded-2xl border-2 border-ink bg-card p-3">
        <span className="flex h-9 w-9 shrink-0 animate-wiggle items-center justify-center rounded-full border-2 border-ink bg-pop-coral">
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
      <div className="flex items-center gap-3 rounded-2xl border-2 border-ink p-4">
        <Face who="arjun" size={48} bg="bg-pop-sky" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Arjun Mehta</p>
          <p className="truncate text-xs text-muted">&ldquo;Loved your misal video. Tech x food episode?&rdquo;</p>
        </div>
        <span className="btn-primary btn-sm">
          <UserPlus size={14} /> Accept
        </span>
      </div>
      <div className="flex -rotate-1 items-center gap-3 rounded-2xl border-2 border-ink bg-pop-mint/40 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card">
          <Lock size={18} />
        </span>
        <div>
          <p className="font-semibold">Contact unlocked 🎉</p>
          <p className="text-xs text-muted">WhatsApp and email show only after you both say yes.</p>
        </div>
      </div>
    </div>
  );
}

/** The messy sticker collage in the hero. */
function HeroCollage() {
  const cards: { who: Who; bg: string; pos: string; size: number; anim: string }[] = [
    { who: "riya", bg: "bg-pop-yellow", pos: "left-[22%] top-[8%] w-[48%] -rotate-6", size: 220, anim: "animate-float" },
    { who: "arjun", bg: "bg-pop-sky", pos: "left-0 top-[46%] w-[36%] rotate-6", size: 170, anim: "animate-float-slow [animation-delay:-2s]" },
    { who: "kabir", bg: "bg-pop-mint", pos: "right-0 top-[38%] w-[38%] -rotate-3", size: 180, anim: "animate-float [animation-delay:-4s]" },
    { who: "neha", bg: "bg-pop-coral", pos: "left-[30%] bottom-0 w-[34%] rotate-3", size: 160, anim: "animate-float-slow [animation-delay:-1s]" },
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
      <div className="bg-brand-gradient absolute inset-[12%] animate-glow rounded-full blur-3xl" />
      <Star className="absolute top-[4%] left-[6%] h-10 w-10 animate-spin-slow text-pop-yellow" />
      <Sparks className="absolute top-[2%] right-[14%] h-10 w-10 text-brand-ink" />
      <Heart className="absolute right-[6%] bottom-[14%] h-9 w-9 animate-wiggle text-pop-coral" />
      <Zigzag className="absolute bottom-[4%] left-[2%] h-6 w-20 text-pop-mint" />
      <Scribble className="absolute top-[30%] right-[2%] h-12 w-24 text-pop-lilac" />
      {cards.map((c) => (
        <div key={c.who} className={`absolute ${c.pos}`}>
          <div className={c.anim}>
            <div className={`overflow-hidden rounded-[1.75rem] border-[3px] border-ink ${c.bg} shadow-[6px_6px_0_var(--ink)]`}>
              <Peep who={c.who} size={c.size} className="h-auto w-full" />
            </div>
          </div>
        </div>
      ))}
      <Bubble className="top-[2%] left-[52%] rotate-3">need an editor! 🎬</Bubble>
      <Bubble className="top-[40%] left-[-2%] -rotate-6">I&apos;m in! 🙋</Bubble>
      <Bubble className="top-[30%] right-[-4%] rotate-6">shoot on Sunday?</Bubble>
      <span className="absolute right-[18%] bottom-[22%] flex rotate-6 items-center gap-1 rounded-full border-2 border-ink bg-card px-3 py-1 text-xs font-bold shadow-[3px_3px_0_var(--ink)]">
        <BadgeCheck size={14} className="text-brand-ink" /> 128K verified
      </span>
    </div>
  );
}

// Signed-in visitors are sent to /home by proxy.ts, so this page stays static.
export default function LandingPage() {
  return (
    <main className="flex-1 overflow-x-clip">
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,var(--glow-1),transparent),radial-gradient(40%_40%_at_90%_10%,var(--glow-2),transparent)]" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-6">
            <span className="flex -rotate-2 items-center gap-2 self-start rounded-full border-2 border-ink bg-pop-yellow px-3 py-1 text-[13px] font-bold shadow-[3px_3px_0_var(--ink)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
              </span>
              Now live across India · free for creators
            </span>
            <h1 className="text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl">
              Where creators find their{" "}
              <span className="relative inline-block">
                <span className="animate-shimmer bg-[linear-gradient(90deg,var(--grad-1),var(--grad-2),var(--grad-3),var(--grad-2),var(--grad-1))] bg-[length:200%_auto] bg-clip-text text-transparent">
                  next collab
                </span>
                <Squiggle className="absolute -bottom-3 left-0 h-4 w-full text-pop-yellow" />
                <Star className="absolute -top-4 -right-7 h-8 w-8 animate-spin-slow text-pop-coral" />
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted">
              Peerpop is the network for Indian creators. Show your best work, prove your numbers, meet creators near you and team up on your next shoot.
            </p>
            <div className="relative flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary btn-lg transition hover:-rotate-2">
                Join Peerpop free <ArrowRight size={18} />
              </Link>
              <Link href="/creators" className="btn btn-lg border-2 border-ink bg-card shadow-[3px_3px_0_var(--ink)] transition hover:rotate-2">
                Browse creators
              </Link>
              <span className="hidden -rotate-6 items-center font-hand text-2xl font-bold text-brand-ink sm:flex">
                <Arrow className="h-8 w-10 -scale-x-100 rotate-180" /> takes 2 mins!
              </span>
            </div>
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {["Sign in with Google or email", "No fees", "Contact shared only on yes"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={14} className="text-brand-ink" /> {t}
                </span>
              ))}
            </p>
          </div>
          <HeroCollage />
        </div>
      </section>

      <section className="relative -rotate-1 border-y-[3px] border-ink bg-ink py-3">
        <div className="group/marquee overflow-hidden">
          <div className="flex w-max animate-marquee gap-4 group-hover/marquee:[animation-play-state:paused]">
            {[...TYPES, ...TYPES].map((t, i) => (
              <div
                key={i}
                aria-hidden={i >= TYPES.length}
                className={`flex shrink-0 items-center gap-3 rounded-full border-2 border-ink ${t.bg} py-1 pr-5 pl-1 ${i % 2 ? "rotate-2" : "-rotate-2"}`}
              >
                <Face who={t.who} size={44} bg="bg-card" />
                <span className="font-semibold whitespace-nowrap">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 pt-20 pb-6 text-center">
        <Eyebrow>whatever you create, you belong here</Eyebrow>
        <div className="flex max-w-3xl flex-wrap justify-center gap-2">
          {SKILLS.map(([v, l], i) => (
            <span
              key={v}
              className={`rounded-full border-2 border-ink px-4 py-1.5 text-sm font-bold ${["bg-pop-yellow", "bg-pop-sky", "bg-pop-mint", "bg-pop-coral", "bg-pop-lilac"][i % 5]} ${i % 2 ? "rotate-2" : "-rotate-2"}`}
            >
              {l}s
            </span>
          ))}
          {NICHES.filter(([v]) => (POPULAR_NICHES as readonly string[]).includes(v)).map(([v, l], i) => (
            <span
              key={v}
              className={`rounded-full border-2 border-ink bg-card px-4 py-1.5 text-sm font-semibold ${i % 3 === 0 ? "rotate-1" : i % 3 === 1 ? "-rotate-1" : ""}`}
            >
              {l}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-28 px-4 py-20">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <Eyebrow>what you can do on Peerpop</Eyebrow>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Built for how creators actually team up</h2>
          <Sparks className="absolute -top-2 -left-10 hidden h-10 w-10 animate-spin-slow text-pop-yellow sm:block" />
        </div>
        <Feature
          eyebrow="your profile"
          title="A portfolio that proves it"
          text="Your skills sit right under your name, with your best videos and photos below. Verify your YouTube channel and your numbers carry a badge."
          points={["Skills, niches and languages at the top", "Videos and photo grid of your work", "Subscribers and average views straight from YouTube"]}
          note="real numbers!"
          visual={<ProfileMock />}
        />
        <Feature
          flip
          eyebrow="discover"
          title="Find the right creator in seconds"
          text="Filter by city, niche, skill, language and audience size. Every result shows real numbers, so you know who you're talking to."
          points={["181 Indian cities, from metros to small towns", "Filter by the language they shoot in", "See who is open to collab right now"]}
          note="found you!"
          visual={<SearchMock />}
        />
        <Feature
          eyebrow="collabs"
          title="Post an idea, get hands raised"
          text="Say what you're shooting and who you need. Creators with that skill or in your city get an alert and can say they're in with one tap."
          points={["Alerts go to creators who fit", "Pick from the people who raise a hand", "Collabs that fit you show first on Home"]}
          note="3 hands up!"
          visual={<CollabMock />}
        />
        <Feature
          flip
          eyebrow="your network"
          title="Connect without giving out your number"
          text="Send a connect request with a short note. Your WhatsApp and email unlock only when both of you say yes."
          points={["Requests with a personal note", "Contact details stay private until accepted", "A feed of what your connections are making"]}
          note="no spam calls"
          visual={<NetworkMock />}
        />
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y-[3px] border-ink bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-24">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
            <Eyebrow>how it works</Eyebrow>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">From sign-up to your first collab</h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 120} className="h-full">
                  <div
                    className={`flex h-full flex-col gap-3 rounded-2xl border-2 border-ink p-6 shadow-[5px_5px_0_var(--ink)] transition hover:rotate-0 ${s.bg} ${s.tilt}`}
                  >
                    <span className="font-hand text-5xl leading-none font-bold">{i + 1}.</span>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-ink/75">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="mx-auto grid w-full max-w-6xl scroll-mt-20 gap-10 px-4 py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col gap-3">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Questions? Answers.</h2>
          <p className="text-muted">
            Anything else? Write to{" "}
            <a href="mailto:hello@peerpop.in" className="font-semibold text-brand-ink hover:underline">
              hello@peerpop.in
            </a>
            .
          </p>
          <div className="relative mt-4 hidden w-52 lg:block" aria-hidden>
            <div className="-rotate-3 overflow-hidden rounded-[1.75rem] border-[3px] border-ink bg-pop-sky shadow-[6px_6px_0_var(--ink)]">
              <Peep who="om" size={208} className="h-auto w-full" />
            </div>
            <Bubble className="-top-4 -right-16 rotate-6">ask away!</Bubble>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border-2 border-ink bg-card p-5 transition open:shadow-[4px_4px_0_var(--ink)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={18} className="shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8">
        <div className="bg-brand-gradient relative overflow-hidden rounded-[2rem] border-[3px] border-ink p-8 pb-0 text-ink shadow-[8px_8px_0_var(--ink)] sm:p-14 sm:pb-0">
          <Star className="absolute top-8 right-10 h-10 w-10 animate-spin-slow text-pop-yellow" aria-hidden />
          <Heart className="absolute top-24 right-36 hidden h-8 w-8 animate-wiggle text-pop-coral sm:block" aria-hidden />
          <div className="relative flex max-w-2xl flex-col gap-5">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Your next collab is one connection away.</h2>
            <p className="text-lg text-white/85">Set up your profile in two minutes. Free, with Google or email.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-lg border-2 border-ink bg-white text-ink shadow-[3px_3px_0_var(--ink)] transition hover:-rotate-2">
                Get started <ArrowRight size={18} />
              </Link>
              <Link href="/creators" className="btn btn-lg border-2 border-white/60 text-white hover:bg-white/10">
                Browse creators
              </Link>
            </div>
          </div>
          <div className="mt-10 flex items-end justify-center gap-1 sm:justify-end" aria-hidden>
            {(["sana", "dev", "riya", "rohan", "isha", "meera"] as Who[]).map((w, i) => (
              <div
                key={w}
                className={`${i % 2 ? "animate-float-slow" : "animate-float"} ${i > 3 ? "hidden sm:block" : ""}`}
                style={{ animationDelay: `${-i * 0.7}s` }}
              >
                <Peep who={w} size={120} className="h-auto w-20 sm:w-28" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
