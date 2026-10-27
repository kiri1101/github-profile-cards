// Secrets are set with `wrangler secret put`, so `wrangler types` cannot see them.
declare namespace Cloudflare {
  interface Env {
    GH_TOKEN_PROFILE: string;
    GH_TOKEN_REPOS: string;
  }
}

// The generated global `Env` does not pick up the namespace merge above, so merge here too.
// Secret names are declared explicitly so type generation never depends on a local .dev.vars.
interface Env {
  GH_TOKEN_PROFILE: string;
  GH_TOKEN_REPOS: string;
}
