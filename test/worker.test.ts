import { env } from "cloudflare:workers";
import {
  createExecutionContext,
  createScheduledController,
  waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index.ts";
import { refresh } from "../src/refresh.ts";
import profile from "./fixtures/profile.json" with { type: "json" };
import repos from "./fixtures/repos.json" with { type: "json" };

const NOW = new Date("2026-10-27T06:00:00Z");
const NO_NETWORK = new Error("network disabled in tests");
const KEYS = ["stats-light.svg", "stats-dark.svg", "snapshot.json"];
const ALL_KEYS = [...KEYS, "pending.json"];

function stub(opts: { status?: number; repos?: unknown; profile?: unknown } = {}) {
  return (async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (opts.status) return new Response("nope", { status: opts.status });
    const body = JSON.parse(String(init?.body)) as { query: string };
    return Response.json(
      body.query.includes("contributionsCollection") ? (opts.profile ?? profile) : (opts.repos ?? repos),
    );
  }) as typeof fetch;
}

async function clearKv() {
  for (const k of ALL_KEYS) await env.STATS.delete(k);
}

async function get(path: string, init?: RequestInit) {
  const request = new Request(`https://x.test${path}`, init) as Request<
    unknown,
    IncomingRequestCfProperties
  >;
  return worker.fetch(request, env);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await clearKv();
});

describe("refresh", () => {
  it("writes both SVGs and the snapshot", async () => {
    expect(await refresh(env, NOW, stub())).toEqual({ ok: true });
    expect(await env.STATS.get("stats-light.svg")).toContain(">1,383<");
    const snap = JSON.parse((await env.STATS.get("snapshot.json"))!);
    expect(snap.level).toBe("B+");
  });

  it("a 401 keeps the last good images", async () => {
    await env.STATS.put("stats-light.svg", "<svg>old-light</svg>");
    await env.STATS.put("stats-dark.svg", "<svg>old-dark</svg>");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await refresh(env, NOW, stub({ status: 401 }));
    expect(res.ok).toBe(false);
    expect(await env.STATS.get("stats-light.svg")).toBe("<svg>old-light</svg>");
    expect(await env.STATS.get("stats-dark.svg")).toBe("<svg>old-dark</svg>");
    expect(await env.STATS.get("snapshot.json")).toBeNull();
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).toContain("refresh_failed");
    expect(logged).not.toContain("test-profile");
    expect(logged).not.toContain("test-repos");
  });

  it("an implausible drop keeps the last good images", async () => {
    await refresh(env, NOW, stub());
    const before = await Promise.all(KEYS.map((k) => env.STATS.get(k)));
    const mutated = structuredClone(repos);
    mutated.data.user.pullRequests.totalCount = 100;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await refresh(env, NOW, stub({ repos: mutated }));
    expect(res).toEqual({ ok: false, reason: "prsTotal fell from 237 to 100" });
    expect(await Promise.all(KEYS.map((k) => env.STATS.get(k)))).toEqual(before);
  });
});

function dropped(prs = 100, extra: Record<string, unknown> = {}) {
  const m = structuredClone(repos);
  m.data.user.pullRequests.totalCount = prs;
  return stub({ repos: m, ...extra });
}

describe("drop recovery (pending.json)", () => {
  async function seed() {
    await refresh(env, NOW, stub());
    return Promise.all(KEYS.map((k) => env.STATS.get(k)));
  }
  const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

  it("rejects three identical drops, leaving KV unchanged, and accepts the fourth", async () => {
    const before = await seed();
    const err = quiet();
    for (let i = 1; i <= 3; i++) {
      const res = await refresh(env, NOW, dropped());
      expect(res).toEqual({ ok: false, reason: "prsTotal fell from 237 to 100" });
      expect(await Promise.all(KEYS.map((k) => env.STATS.get(k)))).toEqual(before);
      expect(JSON.parse((await env.STATS.get("pending.json"))!).count).toBe(i);
    }
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await refresh(env, NOW, dropped())).toEqual({ ok: true });
    const snap = JSON.parse((await env.STATS.get("snapshot.json"))!);
    expect(snap.prsTotal).toBe(100);
    expect(await env.STATS.get("stats-light.svg")).not.toBe(before[0]);
    expect(await env.STATS.get("pending.json")).toBeNull();
    const logged = JSON.stringify([...err.mock.calls, ...log.mock.calls, ...warn.mock.calls]);
    expect(logged).toContain("drop_accepted");
  });

  it("stores signature, count and firstSeenAt", async () => {
    await seed();
    quiet();
    await refresh(env, NOW, dropped());
    const p = JSON.parse((await env.STATS.get("pending.json"))!);
    expect(p.count).toBe(1);
    expect(p.firstSeenAt).toBe(NOW.toISOString());
    expect(p.signature).toEqual([["prsTotal", 100]]);
  });

  it("a differing candidate in between resets the count", async () => {
    await seed();
    quiet();
    await refresh(env, NOW, dropped(100));
    await refresh(env, NOW, dropped(100));
    await refresh(env, NOW, dropped(90));
    expect(JSON.parse((await env.STATS.get("pending.json"))!).count).toBe(1);
    await refresh(env, NOW, dropped(100));
    await refresh(env, NOW, dropped(100));
    const res = await refresh(env, NOW, dropped(100));
    expect(res.ok).toBe(false);
    expect(JSON.parse((await env.STATS.get("snapshot.json"))!).prsTotal).toBe(237);
  });

  it("an unrelated counter changing between identical drops does not reset the count", async () => {
    await seed();
    quiet();
    for (let i = 0; i < 3; i++) {
      const p = structuredClone(profile);
      p.data.user.followers.totalCount = 3 + i;
      expect((await refresh(env, NOW, dropped(100, { profile: p }))).ok).toBe(false);
    }
    expect(JSON.parse((await env.STATS.get("pending.json"))!).count).toBe(3);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await refresh(env, NOW, dropped(100))).toEqual({ ok: true });
    expect(JSON.parse((await env.STATS.get("snapshot.json"))!).prsTotal).toBe(100);
  });

  it("a second counter dropping to zero on the fourth run resets the count", async () => {
    await seed();
    quiet();
    for (let i = 0; i < 3; i++) await refresh(env, NOW, dropped(100));
    const m = structuredClone(repos);
    m.data.user.pullRequests.totalCount = 100;
    m.data.publicPrs.issueCount = 0;
    const res = await refresh(env, NOW, stub({ repos: m }));
    expect(res.ok).toBe(false);
    expect(JSON.parse((await env.STATS.get("pending.json"))!).count).toBe(1);
    expect(JSON.parse((await env.STATS.get("snapshot.json"))!).prsTotal).toBe(237);
  });

  it("a malformed pending.json is ignored, not trusted", async () => {
    await seed();
    const err = quiet();
    await refresh(env, NOW, dropped(100));
    const good = JSON.parse((await env.STATS.get("pending.json"))!);
    await env.STATS.put("pending.json", JSON.stringify({ ...good, count: "99" }));
    expect((await refresh(env, NOW, dropped(100))).ok).toBe(false);
    expect(JSON.parse((await env.STATS.get("pending.json"))!).count).toBe(1);
    await env.STATS.put("pending.json", JSON.stringify({ ...good, count: 4 }));
    expect((await refresh(env, NOW, dropped(100))).ok).toBe(false);
    expect(JSON.parse((await env.STATS.get("pending.json"))!).count).toBe(1);
    await env.STATS.put("pending.json", "{not json");
    expect((await refresh(env, NOW, dropped(100))).ok).toBe(false);
    expect(JSON.stringify(err.mock.calls)).toContain("pending_unreadable");
  });

  it("a structural invalidity never accumulates", async () => {
    await seed();
    quiet();
    const m = structuredClone(repos);
    m.data.user.pullRequests.totalCount = 10; // below public count => public > total
    for (let i = 0; i < 6; i++) {
      const res = await refresh(env, NOW, stub({ repos: m }));
      expect(res.ok).toBe(false);
    }
    expect(await env.STATS.get("pending.json")).toBeNull();
    expect(JSON.parse((await env.STATS.get("snapshot.json"))!).prsTotal).toBe(237);
  });

  it("a normal success clears pending.json", async () => {
    await seed();
    quiet();
    await refresh(env, NOW, dropped());
    expect(await env.STATS.get("pending.json")).not.toBeNull();
    expect(await refresh(env, NOW, stub())).toEqual({ ok: true });
    expect(await env.STATS.get("pending.json")).toBeNull();
  });

  it("a public counter dropping to zero is held back like other drops", async () => {
    await seed();
    quiet();
    const m = structuredClone(repos);
    m.data.publicPrs.issueCount = 0;
    const res = await refresh(env, NOW, stub({ repos: m }));
    expect(res).toEqual({ ok: false, reason: "prsPublic dropped to zero" });
  });
});

describe("refresh failure causes and recovery", () => {
  it("keeps the cause of a 200 response carrying GraphQL errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = (async () =>
      Response.json({ errors: [{ message: "Bad credentials probe" }] })) as typeof fetch;
    const res = await refresh(env, NOW, fetchFn);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("Bad credentials probe");
  });

  it("recovers from a corrupt snapshot.json", async () => {
    await env.STATS.put("snapshot.json", "{not json");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await refresh(env, NOW, stub())).toEqual({ ok: true });
    expect(JSON.stringify(err.mock.calls)).toContain("snapshot_unreadable");
    expect(JSON.parse((await env.STATS.get("snapshot.json"))!).level).toBe("B+");
  });
});

describe("scheduled", () => {
  it("scheduled() runs refresh", async () => {
    const auth: string[] = [];
    const inner = stub();
    vi.spyOn(globalThis, "fetch").mockImplementation((async (u: RequestInfo | URL, init?: RequestInit) => {
      auth.push(new Headers(init?.headers).get("Authorization") ?? "");
      return inner(u, init);
    }) as typeof fetch);
    const ctx = createExecutionContext();
    await worker.scheduled(
      createScheduledController({ scheduledTime: NOW, cron: "0 */6 * * *" }),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(await env.STATS.get("stats-dark.svg")).not.toBeNull();
    expect(auth.sort()).toEqual(["bearer test-profile", "bearer test-repos"]);
  });
});

describe("scheduled failure signalling", () => {
  it("rejects when the refresh fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (async () => new Response("nope", { status: 401 })) as typeof fetch,
    );
    const ctx = createExecutionContext();
    await expect(
      worker.scheduled(createScheduledController({ scheduledTime: NOW, cron: "0 */6 * * *" }), env, ctx),
    ).rejects.toThrow(/401/);
    await waitOnExecutionContext(ctx);
    expect(JSON.stringify(err.mock.calls)).not.toContain("test-profile");
  });

  it("resolves when the refresh succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(((u: RequestInfo | URL, init?: RequestInit) =>
      stub()(u, init)) as typeof fetch);
    const ctx = createExecutionContext();
    await expect(
      worker.scheduled(createScheduledController({ scheduledTime: NOW, cron: "0 */6 * * *" }), env, ctx),
    ).resolves.toBeUndefined();
    await waitOnExecutionContext(ctx);
    expect(await env.STATS.get("snapshot.json")).not.toBeNull();
  });
});

describe("fetch handler", () => {
  it("a throwing KV read serves the placeholder with no-store", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(NO_NETWORK);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { ...env, STATS: { get: async () => { throw new Error("kv down"); } } } as unknown as Env;
    const request = new Request("https://x.test/stats-light.svg") as Request<
      unknown,
      IncomingRequestCfProperties
    >;
    const res = await worker.fetch(request, broken);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("updating");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(JSON.stringify(err.mock.calls)).toContain("kv_read_failed");
  });

  it("GET /stats-dark.svg?theme=light serves the dark SVG", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(NO_NETWORK);
    await env.STATS.put("stats-dark.svg", "<svg>dark</svg>");
    await env.STATS.put("stats-light.svg", "<svg>light</svg>");
    const res = await get("/stats-dark.svg?theme=light");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<svg>dark</svg>");
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'",
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("empty KV serves the placeholder", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(NO_NETWORK);
    const res = await get("/stats-light.svg");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("updating");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    expect(spy).not.toHaveBeenCalled();
  });

  it("HEAD returns headers and no body", async () => {
    await env.STATS.put("stats-light.svg", "<svg>light</svg>");
    const res = await get("/stats-light.svg", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await res.text()).toBe("");
  });

  it("POST returns 405 with Allow", async () => {
    const res = await get("/stats-light.svg", { method: "POST" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("other paths return 404", async () => {
    expect((await get("/stats-light.svg/")).status).toBe(404);
    expect((await get("/other")).status).toBe(404);
  });
});

describe("test credentials", () => {
  it("uses the fake test tokens, never a local .dev.vars", () => {
    expect(env.GH_TOKEN_PROFILE).toBe("test-profile");
    expect(env.GH_TOKEN_REPOS).toBe("test-repos");
  });
});
