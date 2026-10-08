/**
 * MONARCH CODEX Pages -> Hostinger API bridge.
 *
 * Cloudflare Pages serves the HTML/CSS/JS, while the existing PHP/MySQL
 * application remains on Hostinger. The browser still calls /api/*.php,
 * but this same-origin Function forwards those requests to Hostinger.
 *
 * Required Cloudflare Pages environment variable:
 * HOSTINGER_API_ORIGIN = https://your-hostinger-backend.example
 *
 * Do not put database passwords or API keys in this file.
 */
export async function onRequest(context) {
  const origin = String(context.env.HOSTINGER_API_ORIGIN || "https://aquamarine-eagle-131964.hostingersite.com").trim().replace(/\/$/, "");

  if (!origin) {
    return new Response(JSON.stringify({
      success: false,
      message: "MONARCH CODEX API backend is not connected. Configure HOSTINGER_API_ORIGIN in Cloudflare Pages."
    }), {
      status: 503,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  const incoming = new URL(context.request.url);
  const path = context.params.path;
  const segments = Array.isArray(path) ? path : (path ? [path] : []);
  const target = new URL(origin + "/api/" + segments.map(encodeURIComponent).join("/"));
  target.search = incoming.search;

  const headers = new Headers(context.request.headers);
  // The PHP API's same-origin protection intentionally accepts requests
  // without an Origin header. The browser remains same-origin with Pages.
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("host");
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", incoming.protocol.replace(":", ""));

  const init = {
    method: context.request.method,
    headers,
    redirect: "manual"
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = context.request.body;
  }

  try {
    const upstream = await fetch(target.toString(), init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: "MONARCH CODEX API backend could not be reached."
    }), {
      status: 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
}
