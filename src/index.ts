import {
  refresh,
  refreshLanguages,
  KEY_DARK,
  KEY_LANGS_DARK,
  KEY_LANGS_LIGHT,
  KEY_LIGHT,
} from "./refresh.ts";
import { renderLangsPlaceholder } from "./render/langs-card.ts";
import { renderPlaceholder } from "./render/placeholder.ts";
import type { Theme } from "./render/measure.ts";

type Route = { key: string; theme: Theme; placeholder: (theme: Theme) => string };

const ROUTES: Record<string, Route> = {
  "/stats-light.svg": { key: KEY_LIGHT, theme: "light", placeholder: renderPlaceholder },
  "/stats-dark.svg": { key: KEY_DARK, theme: "dark", placeholder: renderPlaceholder },
  "/langs-light.svg": { key: KEY_LANGS_LIGHT, theme: "light", placeholder: renderLangsPlaceholder },
  "/langs-dark.svg": { key: KEY_LANGS_DARK, theme: "dark", placeholder: renderLangsPlaceholder },
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
    const body = stored ?? route.placeholder(route.theme);
    const cache = stored ? "public, max-age=3600" : kvFailed ? "no-store" : "no-cache";
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { ...SECURITY_HEADERS, "Cache-Control": cache },
    });
  },

  async scheduled(controller, env, ctx) {
    // Both refreshes always run; each has already logged its own failure. Rejecting after both settle
    // makes Cloudflare's Cron events show a failed run if either failed.
    const when = new Date(controller.scheduledTime);
    const run = Promise.allSettled([refresh(env, when), refreshLanguages(env, when)]).then((settled) => {
      const reasons: string[] = [];
      const labels = ["stats", "languages"];
      settled.forEach((s, i) => {
        if (s.status === "rejected") reasons.push(`${labels[i]}: ${s.reason instanceof Error ? s.reason.message : "unknown error"}`);
        else if (!s.value.ok) reasons.push(`${labels[i]}: ${s.value.reason}`);
      });
      if (reasons.length > 0) throw new Error(reasons.join("; "));
    });
    ctx.waitUntil(run.catch(() => {}));
    await run;
  },
} satisfies ExportedHandler<Env>;
