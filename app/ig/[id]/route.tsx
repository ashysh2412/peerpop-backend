import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { plainHeadline } from "@/lib/instagram/ideas";
import { createAdminClient } from "@/lib/supabase/admin";

// The image Instagram fetches for each Peerpop post (4:5, JPEG as Instagram requires).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Billboard look: one big line on a bold colour. Posts take the colours in turn.
const THEMES = [
  { bg: "#f0b100", fg: "#111111", hi: "#ffffff", sub: "rgba(17,17,17,0.8)", tile: "#111111" },
  { bg: "#111111", fg: "#f0b100", hi: "#ffffff", sub: "rgba(240,177,0,0.85)", tile: "#222222" },
  { bg: "#ffffff", fg: "#111111", hi: "#f0b100", sub: "rgba(17,17,17,0.75)", tile: "#111111" },
];

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Inter-Bold.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
  readFile(join(process.cwd(), "public/logo.png")),
]);

/** Each word is its own box so a colour change can happen mid-line and still wrap naturally. */
function words(text: string, color: string) {
  return text
    .split(" ")
    .filter(Boolean)
    .map((w, i) => (
      <span key={`${color}${i}`} style={{ color, marginRight: "0.25em" }}>
        {w}
      </span>
    ));
}

export async function GET(_request: Request, { params }: RouteContext<"/ig/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const db = createAdminClient();
  const { data: post } = await db.from("ig_posts").select("kind, headline, subline, status, created_at").eq("id", id).maybeSingle();
  if (!post || post.status === "skipped") return new Response("Not found", { status: 404 });
  // A weekly batch is drafted all at once, so posts drafted at the same moment are ordered by id.
  const at = `"${post.created_at}"`;
  const { count: before } = await db
    .from("ig_posts")
    .select("id", { count: "exact", head: true })
    .or(`created_at.lt.${at},and(created_at.eq.${at},id.lt.${id})`);

  const [bold, medium, logo] = await fonts;
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const theme = THEMES[(before ?? 0) % THEMES.length];
  // The part after "|" is the punchline and gets the highlight colour.
  const [lead, punch = ""] = post.headline.split("|");
  const len = plainHeadline(post.headline).length;
  const size = len > 70 ? 92 : len > 55 ? 104 : len > 40 ? 118 : 138;

  const png = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: theme.bg,
        color: theme.fg,
        padding: "96px 90px",
        fontFamily: "Inter",
      }}
    >
      <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", fontSize: size, fontWeight: 700, lineHeight: 1.0, letterSpacing: -5 }}>
        {[...words(lead, theme.fg), ...words(punch, theme.hi)]}
      </div>
      {post.subline && <div style={{ marginTop: 48, fontSize: 44, fontWeight: 500, color: theme.sub, display: "flex" }}>{post.subline}</div>}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: theme.tile, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={68} height={68} alt="" />
          </div>
          <div style={{ fontSize: 50, fontWeight: 700, letterSpacing: -1.5 }}>Peerpop</div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 500, color: theme.sub }}>peerpop.in</div>
      </div>
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Inter", data: bold, weight: 700, style: "normal" },
        { name: "Inter", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 90 })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=300" } });
}
