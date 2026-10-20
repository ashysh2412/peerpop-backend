import Image from "next/image";
import Link from "next/link";
import { deletePost } from "@/app/posts/actions";
import { CITIES, labelFor } from "@/lib/catalog";
import { POST_IMAGE_BUCKET, type FeedPost } from "@/lib/feed/data";
import { parseVideoUrl } from "@/lib/videos/parse";
import { Avatar } from "./avatar";
import { LikeButton } from "./like-button";
import { VideoEmbed } from "./video-embed";
import { updatedLabel } from "./youtube-stats";

export function postImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_IMAGE_BUCKET}/${path}`;
}

/** One post as it appears in the feed and on its own page. */
export function PostCard({ post, me, now, linkToPost = true }: { post: FeedPost; me: string | null; now: number; linkToPost?: boolean }) {
  const video = post.link_url ? parseVideoUrl(post.link_url) : null;
  const city = post.author_city ? labelFor(CITIES, post.author_city) : null;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex items-center gap-3">
        <Link href={`/creators/${post.author_handle}`}>
          <Avatar path={post.author_photo} name={post.author_name} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/creators/${post.author_handle}`} className="font-medium hover:underline">
            {post.author_name}
          </Link>
          <p className="truncate text-xs text-zinc-500">
            @{post.author_handle}
            {city && ` · ${city}`}
            {post.is_connection && " · Connection"}
            {" · "}
            <Link href={`/posts/${post.id}`} className="hover:underline">
              {updatedLabel(post.created_at, now)}
            </Link>
          </p>
        </div>
        {me === post.author_id && (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button className="rounded-full px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900">Delete</button>
          </form>
        )}
      </header>

      <p className="whitespace-pre-wrap break-words">{post.body}</p>

      {post.image_path && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <Image src={postImageUrl(post.image_path)} alt="" fill sizes="(min-width: 768px) 600px, 100vw" className="object-cover" />
        </div>
      )}
      {video ? (
        <VideoEmbed
          video={{ id: post.id, platform: video.platform, url: video.url, external_id: video.externalId, title: null, thumbnail_url: video.thumbnailUrl, position: 0 }}
        />
      ) : (
        post.link_url && (
          <a href={post.link_url} target="_blank" rel="noreferrer nofollow" className="truncate text-sm text-violet-600 hover:underline">
            {post.link_url}
          </a>
        )
      )}

      <footer className="-mx-1 flex items-center gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-900">
        {me ? (
          <LikeButton postId={post.id} liked={post.liked_by_me} count={post.like_count} />
        ) : (
          <span className="px-3 py-1.5 text-sm text-zinc-500">♡ {post.like_count}</span>
        )}
        {linkToPost ? (
          <Link
            href={`/posts/${post.id}`}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            💬 Comment{post.comment_count > 0 && ` ${post.comment_count}`}
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm text-zinc-500">
            💬 {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
          </span>
        )}
      </footer>
    </article>
  );
}
