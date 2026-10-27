import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { GH_TOKEN_PROFILE: "test-profile", GH_TOKEN_REPOS: "test-repos" },
      },
    }),
  ],
});
