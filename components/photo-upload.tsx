"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_TYPES, avatarUrl } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/client";
import { secondaryButton } from "./ui";

/**
 * Uploads a profile photo straight to Supabase Storage (into the user's own
 * folder) and reports the stored path. `onUploaded` decides what to do next:
 * onboarding keeps it in a hidden field; settings saves it right away.
 */
export function PhotoUpload({
  userId,
  initialPath,
  name,
  onUploaded,
}: {
  userId: string;
  initialPath: string | null;
  name: string;
  onUploaded?: (path: string | null) => Promise<{ ok?: boolean; message?: string } | void>;
}) {
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const url = avatarUrl(path);

  async function onFile(file: File) {
    setError(null);
    if (!AVATAR_TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > AVATAR_MAX_BYTES) return setError("Use an image under 2 MB.");
    setBusy(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const newPath = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from(AVATAR_BUCKET)
      .upload(newPath, file, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) {
      setBusy(false);
      return setError("Upload failed. Please try again.");
    }
    const result = await onUploaded?.(newPath);
    setBusy(false);
    if (result && !result.ok) return setError(result.message ?? "Couldn't save your photo.");
    setPath(newPath);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        {url && <Image src={url} alt="Profile photo" fill sizes="80px" className="object-cover" />}
      </div>
      <div className="flex flex-col gap-2">
        <input type="hidden" name={name} value={path ?? ""} />
        <input
          ref={input}
          type="file"
          accept={AVATAR_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={secondaryButton}>
          {busy ? "Uploading…" : url ? "Change photo" : "Add a photo"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
