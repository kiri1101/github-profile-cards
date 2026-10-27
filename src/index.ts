import { refresh, KEY_DARK, KEY_LIGHT } from "./refresh.ts";
import { renderPlaceholder } from "./render/placeholder.ts";

const ROUTES: Record<string, { key: string; theme: "light" | "dark" }> = {
  "/stats-light.svg": { key: KEY_LIGHT, theme: "light" },
  "/stats-dark.svg": { key: KEY_DARK, theme: "dark" },
};

const SECURITY_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
};

export default {
  async fetch(request, env) {
    const route = ROUTES[new URL(request.url).pathname];
    if (!route) return new Response("Not found", { status: 404 });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    let stored: string | null = null;
    let kvFailed = false;
    try {
      stored = await env.STATS.get(route.key);
    } catch {
      kvFailed = true;
      console.error(JSON.stringify({ event: "kv_read_failed" }));
    }
    const body = stored ?? renderPlaceholder(route.theme);
    const cache = stored ? "public, max-age=3600" : kvFailed ? "no-store" : "no-cache";
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { ...SECURITY_HEADERS, "Cache-Control": cache },
    });
  },

  async scheduled(controller, env, ctx) {
    // Awaited and rethrown so Cloudflare's Cron events show a failed run; refresh() has already logged.
    const run = refresh(env, new Date(controller.scheduledTime)).then((result) => {
      if (!result.ok) throw new Error(result.reason);
    });
    ctx.waitUntil(run.catch(() => {}));
    await run;
  },
} satisfies ExportedHandler<Env>;
