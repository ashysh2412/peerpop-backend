"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, inputClass, secondaryButton } from "@/components/ui";
import { YouTubeStats } from "@/components/youtube-stats";
import type { FormState, OwnYouTube } from "@/lib/profile/types";
import { Card } from "./sections";
import {
  checkYouTubeVerification,
  refreshYouTubeNow,
  removeYouTubeChannel,
  startYouTubeVerification,
} from "./youtube-actions";

export function YouTubeSection({ account }: { account: OwnYouTube | undefined }) {
  if (account?.source === "verified") return <Verified account={account} />;
  return (
    <Card
      title="Verify your YouTube channel"
      description="Verified channels show real subscriber and view numbers with a ✓ badge, so brands and creators can trust them."
    >
      {account?.verification_code ? <PendingCode account={account} /> : <ChannelForm defaultUrl={account?.url ?? ""} />}
    </Card>
  );
}

function ChannelForm({ defaultUrl, submitLabel = "Get my code" }: { defaultUrl: string; submitLabel?: string }) {
  const [state, action] = useActionState<FormState, FormData>(startYouTubeVerification, {});
  const error = state.errors?.channel_url;
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="channel_url" className="text-sm font-medium">
        Your channel link
      </label>
      <input
        id="channel_url"
        name="channel_url"
        inputMode="url"
        placeholder="youtube.com/@yourname"
        defaultValue={defaultUrl}
        aria-invalid={!!error}
        className={inputClass}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-4">
        <SubmitButton pendingText="Looking up…">{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function PendingCode({ account }: { account: OwnYouTube }) {
  const [state, action] = useActionState<FormState>(checkYouTubeVerification, {});
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm">
        Channel: <span className="font-medium">{account.handle ?? account.url}</span>
      </p>
      <div className="flex flex-col gap-2 rounded-xl bg-brand-soft p-4">
        <p className="text-sm font-medium text-brand-ink">Your code</p>
        <p className="select-all font-mono text-2xl font-bold tracking-wide text-brand-ink">
          {account.verification_code}
        </p>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/90">
        <li>
          Open{" "}
          <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="text-brand underline">
            YouTube Studio
          </a>{" "}
          and go to <b>Customisation</b> → <b>Profile</b> (or <b>Basic info</b>).
        </li>
        <li>Paste the code anywhere in your channel <b>Description</b> and click <b>Publish</b>.</li>
        <li>Come back here and press <b>Check my channel</b>. You can remove the code afterwards.</li>
      </ol>
      <form action={action} className="flex items-center gap-4">
        <SubmitButton pendingText="Checking…">Check my channel</SubmitButton>
        <FormMessage state={state} />
      </form>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Use a different channel</summary>
        <div className="mt-3">
          <ChannelForm defaultUrl="" submitLabel="Get a new code" />
        </div>
      </details>
    </div>
  );
}

function Verified({ account }: { account: OwnYouTube }) {
  const [state, refreshAction] = useActionState<FormState>(refreshYouTubeNow, {});
  return (
    <Card title="YouTube">
      <p className="flex items-center gap-2 font-medium">
        {account.handle ?? account.url}
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          ✓ Verified
        </span>
      </p>
      {account.stats ? (
        <YouTubeStats stats={account.stats} />
      ) : (
        <p className="text-sm text-muted">Your numbers will appear after the next refresh.</p>
      )}
      <form action={refreshAction} className="flex items-center gap-4">
        <SubmitButton pendingText="Updating…">Refresh now</SubmitButton>
        <FormMessage state={state} />
      </form>
      <form
        action={removeYouTubeChannel}
        onSubmit={(e) => {
          if (!confirm("Remove your verified YouTube channel from Peerpop?")) e.preventDefault();
        }}
      >
        <button type="submit" className={secondaryButton}>
          Remove channel
        </button>
      </form>
    </Card>
  );
}
