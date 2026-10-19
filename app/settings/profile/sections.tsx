"use client";

import Image from "next/image";
import { useActionState } from "react";
import { IdentityFields, InterestFields, LinkFields } from "@/components/profile-fields";
import { PhotoUpload } from "@/components/photo-upload";
import { Field, FormMessage, SubmitButton, inputClass, secondaryButton } from "@/components/ui";
import type { Contacts, FormState, PlatformAccount, Profile, ProfileVideo } from "@/lib/profile/types";
import {
  addVideo,
  moveVideo,
  removeVideo,
  saveContacts,
  saveProfile,
  saveProfileLinks,
  setPhoto,
} from "./actions";

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function PhotoSection({ userId, photoPath }: { userId: string; photoPath: string | null }) {
  return (
    <Card title="Photo">
      <PhotoUpload userId={userId} initialPath={photoPath} name="photo_path" onUploaded={setPhoto} />
    </Card>
  );
}

export function ProfileSection({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfile, {});
  return (
    <Card title="Profile">
      <form action={action} className="flex flex-col gap-5">
        <IdentityFields profile={profile} errors={state.errors} />
        <InterestFields profile={profile} errors={state.errors} />
        <label className="flex items-center gap-3">
          <input type="hidden" name="is_listed" value="off" />
          <input
            type="checkbox"
            name="is_listed"
            value="on"
            defaultChecked={profile.is_listed}
            className="h-5 w-5 accent-violet-600"
          />
          <span>Show my profile in search</span>
        </label>
        <div className="flex items-center gap-4">
          <SubmitButton>Save profile</SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>
    </Card>
  );
}

export function LinksSection({ platforms }: { platforms: PlatformAccount[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfileLinks, {});
  return (
    <Card title="Channels" description="Leave a field empty to remove that channel.">
      <form action={action} className="flex flex-col gap-5">
        <LinkFields platforms={platforms} errors={state.errors} />
        <div className="flex items-center gap-4">
          <SubmitButton>Save channels</SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>
    </Card>
  );
}

export function VideosSection({ videos }: { videos: ProfileVideo[] }) {
  const [state, action] = useActionState<FormState, FormData>(addVideo, {});
  return (
    <Card
      title="Pinned videos"
      description="Show your best work at the top of your profile. Up to 6 YouTube videos, Shorts or Instagram Reels."
    >
      {videos.length > 0 && (
        <ul className="flex flex-col gap-3">
          {videos.map((v, i) => (
            <li key={v.id} className="flex items-center gap-3">
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
                {v.thumbnail_url ? (
                  <Image src={v.thumbnail_url} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-zinc-500">Instagram</span>
                )}
              </div>
              <a href={v.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm hover:underline">
                {v.title ?? v.url}
              </a>
              <form action={moveVideo} className="flex gap-1">
                <input type="hidden" name="id" value={v.id} />
                <button name="to" value={v.position - 1} disabled={i === 0} aria-label="Move up" className={secondaryButton}>
                  ↑
                </button>
                <button
                  name="to"
                  value={v.position + 1}
                  disabled={i === videos.length - 1}
                  aria-label="Move down"
                  className={secondaryButton}
                >
                  ↓
                </button>
              </form>
              <form action={removeVideo}>
                <input type="hidden" name="id" value={v.id} />
                <button className={secondaryButton}>Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {videos.length < 6 && (
        <form action={action} className="flex flex-col gap-4">
          <Field label="Video link" name="video_url" error={state.errors?.video_url}>
            <input
              id="video_url"
              name="video_url"
              required
              inputMode="url"
              placeholder="https://youtu.be/… or https://instagram.com/reel/…"
              aria-invalid={!!state.errors?.video_url}
              className={inputClass}
            />
          </Field>
          <Field label="Title (optional)" name="title">
            <input id="title" name="title" maxLength={200} className={inputClass} />
          </Field>
          <div className="flex items-center gap-4">
            <SubmitButton pendingText="Adding…">Pin video</SubmitButton>
            <FormMessage state={state} />
          </div>
        </form>
      )}
    </Card>
  );
}

export function ContactsSection({ contacts }: { contacts: Contacts }) {
  const [state, action] = useActionState<FormState, FormData>(saveContacts, {});
  return (
    <Card
      title="Contact details"
      description="Private. Only shown to creators after you accept their connection or collab request."
    >
      <form action={action} className="flex flex-col gap-5">
        <Field label="Email" name="contact_email" error={state.errors?.contact_email}>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={contacts.contact_email ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="WhatsApp number" name="contact_whatsapp" error={state.errors?.contact_whatsapp}>
          <input
            id="contact_whatsapp"
            name="contact_whatsapp"
            type="tel"
            placeholder="+91 98765 43210"
            defaultValue={contacts.contact_whatsapp ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Note (optional)" name="contact_note" hint='For example, "DM me on Instagram first".' error={state.errors?.contact_note}>
          <input
            id="contact_note"
            name="contact_note"
            maxLength={200}
            defaultValue={contacts.contact_note ?? ""}
            className={inputClass}
          />
        </Field>
        <div className="flex items-center gap-4">
          <SubmitButton>Save contact details</SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>
    </Card>
  );
}
