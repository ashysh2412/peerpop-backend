import { MessageCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { deletePost } from "@/app/posts/actions";
import { CITIES, labelFor } from "@/lib/catalog";
import { POST_IMAGE_BUCKET, type FeedPost } from "@/lib/feed/data";
import { parseVideoUrl } from "@/lib/videos/parse";
import { Avatar } from "./avatar";
import { ExpandableText } from "./expandable-text";
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
    <article className="card flex flex-col gap-3 rounded-3xl p-4 pb-2 sm:p-5 sm:pb-2">
      <header className="flex items-center gap-3">
        <Link href={`/creators/${post.author_handle}`}>
          <Avatar path={post.author_photo} name={post.author_name} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <Link href={`/creators/${post.author_handle}`} className="truncate font-bold hover:underline">
              {post.author_name}
            </Link>
            {post.is_connection && <span className="chip-brand py-0.5 text-[11px]">Connection</span>}
          </p>
          <p className="truncate text-xs text-muted">
            {city && `${city} · `}
            <Link href={`/posts/${post.id}`} className="hover:underline">
              {updatedLabel(post.created_at, now)}
            </Link>
          </p>
        </div>
        {me === post.author_id && (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button aria-label="Delete post" className="btn-ghost btn-sm h-9 w-9 px-0">
              <Trash2 size={16} />
            </button>
          </form>
        )}
      </header>

      {linkToPost ? <ExpandableText text={post.body} /> : <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{post.body}</p>}

      {post.image_path && (
        <div className="relative aspect-[4/5] max-h-[560px] w-full overflow-hidden rounded-2xl bg-sunken">
          <Image src={postImageUrl(post.image_path)} alt="" fill sizes="(min-width: 640px) 620px, 100vw" className="object-cover" />
        </div>
      )}
      {video ? (
        <div>
          <VideoEmbed
            compact={linkToPost}
          video={{ id: post.id, platform: video.platform, url: video.url, external_id: video.externalId, title: null, thumbnail_url: video.thumbnailUrl, position: 0 }}
          />
        </div>
      ) : (
        post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noreferrer nofollow"
            className="truncate rounded-2xl bg-sunken px-4 py-3 text-sm font-medium text-brand hover:underline"
          >
            {post.link_url.replace(/^https?:\/\//, "")}
          </a>
        )
      )}

      <footer className="-mx-2 flex items-center gap-1 border-t border-line pt-1.5">
        {me ? (
          <LikeButton postId={post.id} liked={post.liked_by_me} count={post.like_count} />
        ) : (
          <span className="btn-ghost btn-sm pointer-events-none">♡ {post.like_count}</span>
        )}
        {linkToPost ? (
          <Link href={`/posts/${post.id}`} className="btn-ghost btn-sm">
            <MessageCircle size={17} /> Comment
            {post.comment_count > 0 && <span className="tabular-nums">{post.comment_count}</span>}
          </Link>
        ) : (
          <span className="btn-ghost btn-sm pointer-events-none">
            <MessageCircle size={17} /> {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
          </span>
        )}
      </footer>
    </article>
  );
}
