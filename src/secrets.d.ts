// Secrets are set with `wrangler secret put`, so `wrangler types` cannot see them.
declare namespace Cloudflare {
  interface Env {
    GH_TOKEN_PROFILE: string;
    GH_TOKEN_REPOS: string;
  }
}
