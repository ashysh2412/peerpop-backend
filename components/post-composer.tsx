"use client";

import { ClipboardPaste, ImagePlus, PlayCircle, X } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPost, lookupVideoTitle } from "@/app/posts/actions";
import { POST_PHOTO_BUCKET, POST_PHOTO_TYPES, uploadPostPhoto } from "@/lib/image/post-photo";
import type { FormState } from "@/lib/profile/types";
import { parseVideoUrl, type ParsedVideo } from "@/lib/videos/parse";
import { Avatar } from "./avatar";
import { FormMessage, SubmitButton } from "./ui";

const BUCKET = POST_PHOTO_BUCKET;
const TYPES = POST_PHOTO_TYPES;
const MAX_PHOTOS = 10;
const PLATFORM_NAMES: Record<ParsedVideo["platform"], string> = {
  youtube: "YouTube video",
  instagram: "Instagram reel",
  drive: "Google Drive video",
  vimeo: "Vimeo video",
};

/** The text, if it is just one link and nothing else. */
const onlyLink = (text: string) => {
  const t = text.trim();
  return /^(https?:\/\/)?\S+\.\S+$/i.test(t) && !/\s/.test(t) ? t : null;
};

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
  const [link, setLink] = useState("");
  const video = link ? parseVideoUrl(link) : null;
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
      setLink("");
    }
    return result;
  }, {});

  async function onFiles(picked: File[]) {
    setError(null);
    const room = MAX_PHOTOS - images.length - uploading;
    if (room <= 0) return setError(`You can add up to ${MAX_PHOTOS} photos.`);
    const batch = picked.slice(0, room);
    if (picked.length > room) setError(`Only the first ${room} added. A post can have up to ${MAX_PHOTOS} photos.`);
    setUploading((n) => n + batch.length);
    // One at a time, so the photos keep the order they were picked in.
    for (const f of batch) {
      const result = await uploadPostPhoto(userId, f);
      setUploading((n) => n - 1);
      if ("path" in result) setImages((list) => [...list, result.path].slice(0, MAX_PHOTOS));
      else setError(result.error);
    }
  }

  /** Puts a link in the post and, for YouTube or Vimeo, fills in the video's title when the text is still empty. */
  function attachLink(raw: string) {
    setLink(raw);
    setShowLink(true);
    if (!parseVideoUrl(raw)) return;
    void lookupVideoTitle(raw).then((title) => {
      if (title && text.current && !text.current.value.trim()) text.current.value = title;
    });
  }

  /** One tap: read the copied link (the phone asks to allow paste once), or open the link box if there is none. */
  async function pasteLink() {
    try {
      const copied = onlyLink(await navigator.clipboard.readText());
      if (copied) return attachLink(copied);
    } catch {
      // Reading the clipboard was refused or isn't supported; fall back to the box.
    }
    setShowLink(true);
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
          required={!link}
          maxLength={3000}
          rows={1}
          onPaste={(e) => {
            // Pasting just a link turns it into the post's video instead of text.
            const pasted = onlyLink(e.clipboardData.getData("text"));
            if (pasted && !link && parseVideoUrl(pasted)) {
              e.preventDefault();
              attachLink(pasted);
            }
          }}
          placeholder={link ? "Say something about it (optional)" : (placeholder ?? `What are you making today, ${firstName}?`)}
          className="min-h-11 w-full resize-y bg-transparent py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted/80"
        />
      </div>
      {showLink && !video && (
        <input
          name="link_url"
          type="url"
          inputMode="url"
          autoFocus={!link}
          value={link}
          onChange={(e) => (parseVideoUrl(e.target.value) ? attachLink(e.target.value) : setLink(e.target.value))}
          placeholder="Paste a link. YouTube, Instagram, Google Drive and Vimeo videos play right in the feed."
          className="input"
        />
      )}
      {video && (
        <div className="flex items-center gap-3 rounded-2xl border border-line p-2">
          <input type="hidden" name="link_url" value={link} />
          <div className="relative flex h-14 w-24 flex-none items-center justify-center overflow-hidden rounded-xl bg-ink">
            {video.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- small preview from i.ytimg.com
              <img src={video.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <PlayCircle size={24} className="relative text-white drop-shadow" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{PLATFORM_NAMES[video.platform]} added</p>
            <p className="truncate text-xs text-muted">{link}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLink("");
              setShowLink(false);
            }}
            aria-label="Remove video"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full hover:bg-sunken"
          >
            <X size={16} />
          </button>
        </div>
      )}
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
          <button type="button" onClick={() => void pasteLink()} className="btn-ghost btn-sm">
            <ClipboardPaste size={17} className="text-sky-500" /> Paste video link
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
