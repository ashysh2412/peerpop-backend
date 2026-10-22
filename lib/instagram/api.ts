import "server-only";

// Instagram API with Instagram Login: posts to a professional (Creator or Business) account,
// no Facebook Page needed.
const GRAPH = "https://graph.instagram.com";
const VERSION = "v23.0";
export const IG_SCOPES = "instagram_business_basic,instagram_business_content_publish";

export function igAppConfig() {
  const appId = process.env.INSTAGRAM_APP_ID?.trim();
  const secret = process.env.INSTAGRAM_APP_SECRET?.trim();
  return appId && secret ? { appId, secret } : null;
}

export function authorizeUrl(appId: string, redirectUri: string, state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.search = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, response_type: "code", scope: IG_SCOPES, state }).toString();
  return u.toString();
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    // Instagram's own message, never the token.
    const msg = body.error?.message ?? body.error_message ?? `Instagram error ${res.status}`;
    throw new Error(String(msg).slice(0, 300));
  }
  return body as T;
}

/** Swaps the login code for a token that lasts about 60 days. */
export async function exchangeCode(code: string, redirectUri: string, app: { appId: string; secret: string }) {
  const form = new URLSearchParams({ client_id: app.appId, client_secret: app.secret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
  const short = await call<{ access_token?: string; data?: { access_token: string }[] }>("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: form,
  });
  const shortToken = short.access_token ?? short.data?.[0]?.access_token;
  if (!shortToken) throw new Error("Instagram didn't return a token.");
  const long = await call<{ access_token: string; expires_in: number }>(
    `${GRAPH}/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: app.secret, access_token: shortToken })}`,
  );
  const me = await call<{ user_id: string; username: string }>(
    `${GRAPH}/${VERSION}/me?${new URLSearchParams({ fields: "user_id,username", access_token: long.access_token })}`,
  );
  return { token: long.access_token, expiresIn: long.expires_in, igUserId: String(me.user_id), username: me.username };
}

/** Gives a token another 60 days. Instagram allows this once it is a day old. */
export async function refreshToken(token: string) {
  return call<{ access_token: string; expires_in: number }>(
    `${GRAPH}/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token })}`,
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Posts one image with its caption. Instagram fetches the image from imageUrl, which must be a public JPEG. */
export async function publishImage(igUserId: string, token: string, imageUrl: string, caption: string) {
  const container = await call<{ id: string }>(`${GRAPH}/${VERSION}/${igUserId}/media`, {
    method: "POST",
    body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token }),
  });
  // Instagram prepares the image first; wait until it's ready.
  for (let i = 0; i < 10; i++) {
    const s = await call<{ status_code?: string }>(
      `${GRAPH}/${VERSION}/${container.id}?${new URLSearchParams({ fields: "status_code", access_token: token })}`,
    );
    if (s.status_code === "FINISHED" || !s.status_code) break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Instagram couldn't use the image.");
    await wait(2000);
  }
  const media = await call<{ id: string }>(`${GRAPH}/${VERSION}/${igUserId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: container.id, access_token: token }),
  });
  const info = await call<{ permalink?: string }>(`${GRAPH}/${VERSION}/${media.id}?${new URLSearchParams({ fields: "permalink", access_token: token })}`).catch(
    () => ({}) as { permalink?: string },
  );
  return { mediaId: media.id, permalink: info.permalink ?? null };
}
