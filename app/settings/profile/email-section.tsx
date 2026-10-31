"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { EMAIL_TOPICS, TOPIC_LABELS, type EmailTopic } from "@/lib/email/topic-list";
import type { FormState } from "@/lib/profile/types";
import { saveEmailSettings } from "./email-actions";
import { Card } from "./sections";

export function EmailSection({ settings }: { settings: Record<EmailTopic, boolean> }) {
  const [state, action] = useActionState<FormState, FormData>(saveEmailSettings, {});
  return (
    <Card id="emails" title="Emails" description="Choose what Peerpop emails you about. Your bell always shows everything.">
      <form action={action} className="flex flex-col gap-4">
        {EMAIL_TOPICS.map((topic) => (
          <label key={topic} className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name={topic} defaultChecked={settings[topic]} className="mt-1 h-4 w-4 accent-black" />
            <span>
              <span className="block text-sm font-semibold">{TOPIC_LABELS[topic][0]}</span>
              <span className="block text-sm text-muted">{TOPIC_LABELS[topic][1]}</span>
            </span>
          </label>
        ))}
        <div className="flex items-center gap-4">
          <SubmitButton>Save email settings</SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>
    </Card>
  );
}
