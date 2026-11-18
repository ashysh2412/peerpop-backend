import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton } from "@/components/skeleton";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { pickRecipients } from "@/lib/admin/broadcast";
import { getAdminOverview } from "@/lib/admin/data";
import { requireUser } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { officialSender } from "./actions";
import { BroadcastForm } from "./form";

export const metadata: Metadata = { title: "Message members · Admin · Peerpop", robots: { index: false } };
// Emails for a big send go out one by one after the page answers.
export const maxDuration = 300;

function currentTime() {
  return Date.now();
}

export default function BroadcastPage() {
  return (
    <main className="page flex max-w-2xl flex-col gap-6">
      <Suspense fallback={<CardsSkeleton />}>
        <Broadcast />
      </Suspense>
    </main>
  );
}

async function Broadcast() {
  const { supabase } = await requireUser("/admin/broadcast");
  if (!(await isConfirmedAdmin(supabase))) notFound();
  const [official, { users }] = await Promise.all([officialSender(createAdminClient()), getAdminOverview(currentTime())]);
  const incomplete = official.id ? pickRecipients(users, "incomplete", official.id, official.blocked) : [];
  const everyone = official.id ? pickRecipients(users, "everyone", official.id, official.blocked) : [];

  return (
    <>
      <div>
        <Link href="/admin" className="btn-ghost btn-sm -ml-2 mb-2">
          <ArrowLeft size={16} /> Admin
        </Link>
        <h1 className="page-title">Message members</h1>
        <p className="mt-1 text-muted">Write once. Each creator gets it as a personal chat from the Peerpop account, and can reply to you there.</p>
      </div>
      {official.id ? (
        <BroadcastForm
          counts={{ incomplete: incomplete.length, everyone: everyone.length }}
          sampleName={(incomplete[0] ?? everyone[0])?.name ?? "Asha"}
        />
      ) : (
        <p className="card p-5">No official Peerpop account is set up yet.</p>
      )}
    </>
  );
}
