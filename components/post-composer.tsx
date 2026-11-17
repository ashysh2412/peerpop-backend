"use client";

import { ImagePlus, Link2, X } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPost } from "@/app/posts/actions";
import { shrinkImage } from "@/lib/image/shrink";
import { createClient } from "@/lib/supabase/client";
import type { FormState } from "@/lib/profile/types";
import { Avatar } from "./avatar";
import { FormMessage, SubmitButton } from "./ui";

const BUCKET = "post-images";
const MAX_BYTES = 5 * 1024 * 1024;
// Phone photos can be big; they get shrunk before upload.
const MAX_PICK_BYTES = 25 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS = 10;

/** "Start a post" box: text, an optional link (YouTube links play inline) and up to 10 photos. */
export function PostComposer({
  userId,
  firstName,
  name,
  photo,
  groupId,
  placeholder,
}: {
  userId: string;
  firstName: string;
  name: string;
  photo: string | null;
  groupId?: string;
  placeholder?: string;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [showLink, setShowLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);

  // The phone "Create > Post" button links to #compose; open the keyboard there.
  useEffect(() => {
    const focus = () => {
      if (window.location.hash === "#compose") text.current?.focus();
    };
    focus();
    window.addEventListener("hashchange", focus);
    return () => window.removeEventListener("hashchange", focus);
  }, []);
  const [state, action] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await createPost(prev, data);
    if (result.ok) {
      form.current?.reset();
      setImages([]);
      setShowLink(false);
    }
    return result;
  }, {});

  /** Shrinks and uploads one photo; returns its storage path, or an error to show. */
  async function upload(picked: File): Promise<{ path: string } | { error: string }> {
    if (!TYPES.includes(picked.type)) return { error: "Use JPG, PNG or WebP images." };
    if (picked.size > MAX_PICK_BYTES) return { error: "Use images under 25 MB." };
    const f = await shrinkImage(picked, 1600);
    if (f.size > MAX_BYTES) return { error: "One image is too big. Please try another one." };
    const ext = f.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await createClient().storage.from(BUCKET).upload(path, f, { contentType: f.type, cacheControl: "31536000" });
    return uploadError ? { error: "Upload failed. Please try again." } : { path };
  }

  async function onFiles(picked: File[]) {
    setError(null);
    const room = MAX_PHOTOS - images.length - uploading;
    if (room <= 0) return setError(`You can add up to ${MAX_PHOTOS} photos.`);
    const batch = picked.slice(0, room);
    if (picked.length > room) setError(`Only the first ${room} added. A post can have up to ${MAX_PHOTOS} photos.`);
    setUploading((n) => n + batch.length);
    // One at a time, so the photos keep the order they were picked in.
    for (const f of batch) {
      const result = await upload(f);
      setUploading((n) => n - 1);
      if ("path" in result) setImages((list) => [...list, result.path].slice(0, MAX_PHOTOS));
      else setError(result.error);
    }
  }

  const url = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  const busy = uploading > 0;

  return (
    <form id="compose" ref={form} action={action} className="card flex scroll-mt-24 flex-col gap-3 rounded-3xl p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar path={photo} name={name} size={44} />
        <textarea
          ref={text}
          name="body"
          required
          maxLength={3000}
          rows={1}
          placeholder={showLink ? "Give your video a title, or say a line about it" : (placeholder ?? `What are you making today, ${firstName}?`)}
          className="min-h-11 w-full resize-y bg-transparent py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted/80"
        />
      </div>
      {showLink && <input name="link_url" type="url" inputMode="url" placeholder="Paste a link. YouTube, Google Drive and Vimeo videos play right in the feed." className="input" />}
      {images.map((path) => (
        <input key={path} type="hidden" name="image_path" value={path} />
      ))}
      {groupId && <input type="hidden" name="group_id" value={groupId} />}
      {(images.length > 0 || busy) && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((path, i) => (
            <div key={path} className="relative h-24 w-24 flex-none overflow-hidden rounded-xl bg-sunken">
              <Image src={url(path)} alt={`Photo ${i + 1} to post`} fill sizes="96px" className="object-cover" />
              {images.length > 1 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 text-[11px] font-bold text-white tabular-nums">{i + 1}</span>
              )}
              <button
                type="button"
                onClick={() => setImages((list) => list.filter((p) => p !== path))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <div key={`up-${i}`} className="h-24 w-24 flex-none animate-pulse rounded-xl bg-sunken" aria-label="Uploading photo" />
          ))}
        </div>
      )}
      <input
        ref={file}
        type="file"
        accept={TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          if (picked.length) void onFiles(picked);
          e.target.value = "";
        }}
      />
      <div className="-mx-2 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <button type="button" disabled={busy || images.length >= MAX_PHOTOS} onClick={() => file.current?.click()} className="btn-ghost btn-sm">
          <ImagePlus size={17} className="text-emerald-500" /> {busy ? "Uploading…" : images.length ? `Photos ${images.length}/${MAX_PHOTOS}` : "Photos"}
        </button>
        {!showLink && (
          <button type="button" onClick={() => setShowLink(true)} className="btn-ghost btn-sm">
            <Link2 size={17} className="text-sky-500" /> Video link
          </button>
        )}
        <div className="ml-auto">
          <SubmitButton pendingText="Posting…" disabled={busy}>
            Post
          </SubmitButton>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!state.ok && <FormMessage state={state} />}
    </form>
  );
}
