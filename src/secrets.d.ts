// Secrets are set with `wrangler secret put`, so `wrangler types` cannot see them.
declare namespace Cloudflare {
  interface Env {
    GH_TOKEN_PROFILE: string;
    GH_TOKEN_REPOS: string;
  }
}

// The generated global `Env` does not pick up the namespace merge above, so merge here too.
interface Env {
  GH_TOKEN_PROFILE: string;
  GH_TOKEN_REPOS: string;
}
