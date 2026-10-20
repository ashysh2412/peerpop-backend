"use client";

import { ImagePlus, Link2, X } from "lucide-react";
import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { createPost } from "@/app/posts/actions";
import { createClient } from "@/lib/supabase/client";
import type { FormState } from "@/lib/profile/types";
import { Avatar } from "./avatar";
import { FormMessage, SubmitButton } from "./ui";

const BUCKET = "post-images";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** "Start a post" box: text, an optional link (YouTube links play inline) and an optional photo. */
export function PostComposer({
  userId,
  firstName,
  name,
  photo,
}: {
  userId: string;
  firstName: string;
  name: string;
  photo: string | null;
}) {
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
    <form ref={form} action={action} className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar path={photo} name={name} size={44} />
        <textarea
          name="body"
          required
          maxLength={3000}
          rows={2}
          placeholder={`What are you working on, ${firstName}?`}
          className="min-h-11 w-full resize-y bg-transparent py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted/80"
        />
      </div>
      {showLink && (
        <input
          name="link_url"
          type="url"
          inputMode="url"
          placeholder="Paste a link. YouTube videos play right in the feed."
          className="input"
        />
      )}
      <input type="hidden" name="image_path" value={image ?? ""} />
      {preview && (
        <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl">
          <Image src={preview} alt="Photo to post" fill sizes="384px" className="object-cover" />
          <button
            type="button"
            onClick={() => setImage(null)}
            aria-label="Remove photo"
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={16} />
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
      <div className="-mx-2 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <button type="button" disabled={busy} onClick={() => file.current?.click()} className="btn-ghost btn-sm">
          <ImagePlus size={17} className="text-emerald-500" /> {busy ? "Uploading…" : "Photo"}
        </button>
        {!showLink && (
          <button type="button" onClick={() => setShowLink(true)} className="btn-ghost btn-sm">
            <Link2 size={17} className="text-sky-500" /> Link or video
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
