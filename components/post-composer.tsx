"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { createPost } from "@/app/posts/actions";
import { createClient } from "@/lib/supabase/client";
import type { FormState } from "@/lib/profile/types";
import { FormMessage, SubmitButton, inputClass, secondaryButton } from "./ui";

const BUCKET = "post-images";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** "Start a post" box: text, an optional link (YouTube links play inline) and an optional photo. */
export function PostComposer({ userId, firstName }: { userId: string; firstName: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [state, action] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await createPost(prev, data);
    if (result.ok) {
      form.current?.reset();
      setImage(null);
      setShowLink(false);
    }
    return result;
  }, {});

  async function onFile(f: File) {
    setError(null);
    if (!TYPES.includes(f.type)) return setError("Use a JPG, PNG or WebP image.");
    if (f.size > MAX_BYTES) return setError("Use an image under 5 MB.");
    setBusy(true);
    const ext = f.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from(BUCKET)
      .upload(path, f, { contentType: f.type, cacheControl: "31536000" });
    setBusy(false);
    if (uploadError) return setError("Upload failed. Please try again.");
    setImage(path);
  }

  const preview = image ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${image}` : null;

  return (
    <form ref={form} action={action} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <textarea
        name="body"
        required
        maxLength={3000}
        rows={3}
        placeholder={`What are you working on, ${firstName}? Share an update or a collab idea.`}
        className="w-full resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      {showLink && (
        <input name="link_url" type="url" inputMode="url" placeholder="Paste a link (YouTube videos play in the feed)" className={inputClass} />
      )}
      <input type="hidden" name="image_path" value={image ?? ""} />
      {preview && (
        <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl">
          <Image src={preview} alt="Photo to post" fill sizes="384px" className="object-cover" />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-sm text-white"
          >
            Remove
          </button>
        </div>
      )}
      <input
        ref={file}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => file.current?.click()} className={secondaryButton}>
          {busy ? "Uploading…" : "📷 Photo"}
        </button>
        {!showLink && (
          <button type="button" onClick={() => setShowLink(true)} className={secondaryButton}>
            🔗 Link
          </button>
        )}
        <div className="ml-auto">
          <SubmitButton pendingText="Posting…">Post</SubmitButton>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!state.ok && <FormMessage state={state} />}
    </form>
  );
}
