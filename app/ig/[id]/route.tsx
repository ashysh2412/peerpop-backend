import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

// The image Instagram fetches for each Peerpop post (4:5, JPEG as Instagram requires).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LABEL = { tip: "For creators", collab: "New collab call", milestone: "This week on Peerpop" } as const;

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Inter-Bold.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Inter-Medium.ttf")),
  readFile(join(process.cwd(), "public/logo.png")),
]);

export async function GET(_request: Request, { params }: RouteContext<"/ig/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const { data: post } = await createAdminClient().from("ig_posts").select("kind, headline, subline, status").eq("id", id).maybeSingle();
  if (!post || post.status === "skipped") return new Response("Not found", { status: 404 });

  const [bold, medium, logo] = await fonts;
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const size = post.headline.length > 60 ? 84 : post.headline.length > 36 ? 100 : 116;

  const png = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f0b100",
        padding: 80,
        fontFamily: "Inter",
        color: "#111111",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", right: -160, top: -160, width: 560, height: 560, borderRadius: 999, background: "#ffc81f", display: "flex" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ width: 104, height: 104, borderRadius: 28, background: "#111111", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={84} height={84} alt="" />
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.5 }}>Peerpop</div>
      </div>
      <div style={{ display: "flex", marginTop: 120 }}>
        <div style={{ background: "#111111", color: "#ffffff", fontSize: 34, fontWeight: 500, padding: "14px 30px", borderRadius: 999 }}>
          {LABEL[post.kind as keyof typeof LABEL] ?? "Peerpop"}
        </div>
      </div>
      <div style={{ marginTop: 44, fontSize: size, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3, maxWidth: 920, display: "flex" }}>{post.headline}</div>
      {post.subline && (
        <div style={{ marginTop: 36, fontSize: 44, fontWeight: 500, lineHeight: 1.3, color: "rgba(17,17,17,0.78)", maxWidth: 880, display: "flex" }}>
          {post.subline}
        </div>
      )}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 36, fontWeight: 500 }}>Find creators to collab with</div>
        <div style={{ background: "#ffffff", fontSize: 36, fontWeight: 700, padding: "20px 36px", borderRadius: 999 }}>Join free · link in bio</div>
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
