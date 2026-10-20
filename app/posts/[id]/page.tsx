import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
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
    <main className="page-narrow flex flex-col gap-4">
      <Link href="/home" className="flex items-center gap-1 self-start text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> Back to feed
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
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
      <section className="card flex flex-col gap-5 p-4 sm:p-5">
        {me ? (
          <CommentForm postId={post.id} />
        ) : (
          <Link href={`/login?next=/posts/${post.id}`} className="btn-secondary self-start">
            Sign in to comment
          </Link>
        )}
        {comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Link href={`/creators/${c.author!.handle}`}>
                <Avatar path={c.author!.photo_path} name={c.author!.display_name} size={32} />
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-sunken px-3.5 py-2.5">
                <p className="text-sm">
                  <Link href={`/creators/${c.author!.handle}`} className="font-semibold hover:underline">
                    {c.author!.display_name}
                  </Link>
                  <span className="ml-2 text-xs text-muted">{updatedLabel(c.created_at, now)}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
              {(me === c.author_id || me === post.author_id) && (
                <form action={deleteComment}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-muted hover:underline">Delete</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
