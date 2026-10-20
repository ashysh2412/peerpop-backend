import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { CommentForm } from "@/components/comment-form";
import { PostCard } from "@/components/post-card";
import { updatedLabel } from "@/components/youtube-stats";
import { getComments, getPost } from "@/lib/feed/data";
import { createClient } from "@/lib/supabase/server";
import { deleteComment } from "../actions";

export const metadata: Metadata = { title: "Post · Peerpop" };

function currentTime() {
  return Date.now();
}

export default function PostPage({ params }: PageProps<"/posts/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <Link href="/home" className="text-sm text-zinc-500 hover:underline">
        ← Back to feed
      </Link>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Post params={params} />
      </Suspense>
    </main>
  );
}

async function Post({ params }: { params: PageProps<"/posts/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user?.id ?? null;
  const [post, comments] = await Promise.all([getPost(supabase, me, id), getComments(supabase, id)]);
  if (!post) notFound();
  const now = currentTime();

  return (
    <>
      <PostCard post={post} me={me} now={now} linkToPost={false} />
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        {me ? (
          <CommentForm postId={post.id} />
        ) : (
          <Link href={`/login?next=/posts/${post.id}`} className="text-sm text-violet-600 hover:underline">
            Sign in to comment
          </Link>
        )}
        {comments.length === 0 && <p className="text-sm text-zinc-500">No comments yet.</p>}
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Link href={`/creators/${c.author!.handle}`}>
                <Avatar path={c.author!.photo_path} name={c.author!.display_name} size={32} />
              </Link>
              <div className="min-w-0 flex-1 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                <p className="text-sm">
                  <Link href={`/creators/${c.author!.handle}`} className="font-medium hover:underline">
                    {c.author!.display_name}
                  </Link>
                  <span className="ml-2 text-xs text-zinc-500">{updatedLabel(c.created_at, now)}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
              {(me === c.author_id || me === post.author_id) && (
                <form action={deleteComment}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-zinc-500 hover:underline">Delete</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
