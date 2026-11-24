"use client";

import { ImagePlus, Pencil, X } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { updatePost } from "@/app/posts/actions";
import { POST_PHOTO_BUCKET, POST_PHOTO_TYPES, uploadPostPhoto } from "@/lib/image/post-photo";
import type { FormState } from "@/lib/profile/types";
import { ExpandableText } from "./expandable-text";
import { FormMessage, SubmitButton } from "./ui";

const EVENT = "peerpop:edit-post";
const MAX_PHOTOS = 10;
const photoUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_PHOTO_BUCKET}/${path}`;

/** The pencil in a post's header; opens the editor below it. */
export function EditPostButton({ postId }: { postId: string }) {
  return (
    <button
      type="button"
      aria-label="Edit post"
      onClick={() => window.dispatchEvent(new CustomEvent(EVENT, { detail: postId }))}
      className="btn-ghost btn-sm h-9 w-9 px-0"
    >
      <Pencil size={16} />
    </button>
  );
}

/** A post's text, which its author can edit in place along with its photos and video link. */
export function PostText({
  postId,
  authorId,
  text,
  images,
  link,
  expandable,
  editable,
}: {
  postId: string;
  authorId: string;
  text: string;
  images: string[];
  link: string | null;
  expandable: boolean;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editable) return;
    const open = (e: Event) => {
      if ((e as CustomEvent<string>).detail === postId) setEditing(true);
    };
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, [editable, postId]);

  if (editing) {
    return <Editor postId={postId} authorId={authorId} text={text} images={images} link={link} onDone={() => setEditing(false)} />;
  }
  return expandable ? <ExpandableText text={text} /> : <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{text}</p>;
}

function Editor({
  postId,
  authorId,
  text,
  images: initialImages,
  link,
  onDone,
}: {
  postId: string;
  authorId: string;
  text: string;
  images: string[];
  link: string | null;
  onDone: () => void;
}) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // Hide the post's own photos and video while editing; the editor shows them.
  useEffect(() => {
    const article = form.current?.closest("article");
    article?.setAttribute("data-editing", "");
    return () => article?.removeAttribute("data-editing");
  }, []);
  const [state, action] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await updatePost(prev, data);
    if (result.ok) onDone();
    return result;
  }, {});

  async function onFiles(picked: File[]) {
    setError(null);
    const room = MAX_PHOTOS - images.length - uploading;
    if (room <= 0) return setError(`A post can have up to ${MAX_PHOTOS} photos.`);
    const batch = picked.slice(0, room);
    setUploading((n) => n + batch.length);
    for (const f of batch) {
      const result = await uploadPostPhoto(authorId, f);
      setUploading((n) => n - 1);
      if ("path" in result) setImages((list) => [...list, result.path].slice(0, MAX_PHOTOS));
      else setError(result.error);
    }
  }

  const busy = uploading > 0;
  return (
    <form ref={form} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={postId} />
      <input type="hidden" name="edit_media" value="1" />
      {images.map((path) => (
        <input key={path} type="hidden" name="image_path" value={path} />
      ))}
      <textarea
        name="body"
        required
        maxLength={3000}
        rows={4}
        defaultValue={text}
        autoFocus
        className="input min-h-32 resize-y py-2.5 text-[15px] leading-relaxed"
      />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Video link
        <input
          name="link_url"
          type="url"
          inputMode="url"
          defaultValue={link ?? ""}
          placeholder="Paste a YouTube, Instagram, Google Drive or Vimeo link"
          className="input font-normal"
        />
        <span className="text-xs font-normal text-muted">Leave it empty to remove the video.</span>
      </label>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Photos</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((path, i) => (
            <div key={path} className="relative h-24 w-24 flex-none overflow-hidden rounded-xl bg-sunken">
              <Image src={photoUrl(path)} alt={`Photo ${i + 1}`} fill sizes="96px" className="object-cover" />
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
          {images.length + uploading < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => file.current?.click()}
              className="flex h-24 w-24 flex-none flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-xs font-medium text-muted hover:bg-sunken"
            >
              <ImagePlus size={20} className="text-emerald-500" />
              Add photo
            </button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept={POST_PHOTO_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length) void onFiles(picked);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <SubmitButton pendingText="Saving…" disabled={busy}>
          Save
        </SubmitButton>
        <button type="button" onClick={onDone} className="btn-secondary">
          Cancel
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
