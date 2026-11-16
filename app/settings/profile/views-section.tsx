"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { FormState } from "@/lib/profile/types";
import { saveBrowsePrivately } from "@/app/profile-views/actions";
import { Card } from "./sections";

export function ViewsSection({ browsePrivately }: { browsePrivately: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveBrowsePrivately, {});
  return (
    <Card id="profile-views" title="Profile views">
      <form action={action} className="flex flex-col gap-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="browse_privately" defaultChecked={browsePrivately} className="mt-1 h-4 w-4 accent-black" />
          <span>
            <span className="block text-sm font-semibold">Browse privately</span>
            <span className="block text-sm text-muted">
              People won&apos;t see that you viewed their profile. You also won&apos;t see who viewed yours, only how many.
            </span>
          </span>
        </label>
        <div className="flex items-center gap-4">
          <SubmitButton>Save</SubmitButton>
          <FormMessage state={state} />
          <Link href="/profile-views" className="ml-auto text-sm font-medium text-brand-ink hover:underline">
            Who viewed me →
          </Link>
        </div>
      </form>
    </Card>
  );
}
