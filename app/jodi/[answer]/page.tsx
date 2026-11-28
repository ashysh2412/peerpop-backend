import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { CHECKIN_ANSWERS, type CheckinAnswer } from "@/lib/jodi/checkin-text";
import { requireUser } from "@/lib/profile/data";
import { answerCheckin } from "./actions";

export const metadata: Metadata = { title: "Your Jodi · Peerpop", robots: { index: false } };

const COPY: Record<CheckinAnswer, { emoji: string; title: string; ask: string; button: string; thanks: string }> = {
  done: {
    emoji: "✅",
    title: "Collab ho gaya!",
    ask: "Awesome! Share your reel link and we might feature it on Peerpop's Instagram.",
    button: "Save",
    thanks: "Saved. Thank you, and keep collabing!",
  },
  talking: {
    emoji: "💬",
    title: "Baat chal rahi hai",
    ask: "Nice! Fix a date and an idea for your reel in chat.",
    button: "OK",
    thanks: "Great. All the best for the reel!",
  },
  stuck: {
    emoji: "😕",
    title: "Aage nahi badha",
    ask: "No worries, it happens. We'll send you fresh Jodis next week.",
    button: "OK",
    thanks: "Done. Fresh Jodis coming next week.",
  },
  waiting: {
    emoji: "⏳",
    title: "Request bheji, reply nahi aaya",
    ask: "We'll remind your Jodi to check your request.",
    button: "Remind them",
    thanks: "",
  },
  later: {
    emoji: "🙈",
    title: "Abhi nahi",
    ask: "No problem. We'll send you fresh Jodis next week.",
    button: "OK",
    thanks: "Done. Fresh Jodis coming next week.",
  },
};

type Props = { params: Promise<{ answer: string }>; searchParams: Promise<{ saved?: string; nudged?: string }> };

export default function JodiAnswerPage(props: Props) {
  return (
    <main className="page flex max-w-md flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Answer {...props} />
      </Suspense>
    </main>
  );
}

async function Answer({ params, searchParams }: Props) {
  const { answer } = await params;
  if (!CHECKIN_ANSWERS.includes(answer as CheckinAnswer)) notFound();
  const a = answer as CheckinAnswer;
  await requireUser(`/jodi/${a}`);
  const { saved, nudged } = await searchParams;
  const copy = COPY[a];
  const thanks =
    a === "waiting"
      ? Number(nudged) > 0
        ? "Done. We've reminded them. Check your messages in a day or two."
        : "We couldn't find a pending request to your Jodis. Open their profile and tap Connect first."
      : copy.thanks;

  return (
    <div className="card flex flex-col gap-4 p-6 text-center">
      <p className="text-4xl">{copy.emoji}</p>
      <h1 className="text-xl font-bold">{copy.title}</h1>
      {saved ? (
        <>
          <p className="text-muted">{thanks}</p>
          <Link href="/home" className="btn-dark self-center">
            Go to Home
          </Link>
        </>
      ) : (
        <form action={answerCheckin} className="flex flex-col gap-3">
          <p className="text-muted">{copy.ask}</p>
          <input type="hidden" name="answer" value={a} />
          {a === "done" && <input name="reel" className="input" placeholder="Reel link (optional)" inputMode="url" />}
          <button className="btn-dark self-center">{copy.button}</button>
        </form>
      )}
    </div>
  );
}
