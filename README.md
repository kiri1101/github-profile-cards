# github-profile-cards

A small Cloudflare Worker that powers a GitHub profile README: a self-hosted stats card (light and dark), plus project cards and tech-stack blocks, all as SVG.

## Why self-hosted

Public stats widgets only see public activity. A freelancer's client work lives in private repositories, so those cards undercount. This Worker uses two read-only tokens so the commit, pull request and issue totals include private work. The letter grade uses the `calculateRank` formula from github-readme-stats.

## What it does

- **Cron Trigger every 6 hours** (00, 06, 12, 18 UTC): fetches the stats from GitHub with both tokens, validates the result against the last stored snapshot, renders the light and dark cards and writes them to Workers KV. If a fetch or validation fails, nothing is overwritten: the card keeps its last good version and a `refresh_failed` event is logged.
- **Fetch handler** serves only the two stats images from KV. It never calls GitHub.
- **Static assets** (project cards and tech-stack blocks) are generated at build time by `npm run build` and served as Workers static assets.

## Endpoints and assets

| Path | Source |
| --- | --- |
| `/stats-light.svg`, `/stats-dark.svg` | KV, `GET` and `HEAD` only. Before the first refresh, a placeholder "updating" card is served. |
| `/cards/<project>-light.svg`, `/cards/<project>-dark.svg` | Static assets (`public/cards/`) |
| `/stack/<group>.svg` | Static assets (`public/stack/`) |

The stats endpoints take no parameters (a query string is ignored). Any other path under the Worker that is not a static asset returns 404; other methods on the stats paths return 405.

## Tokens

Two tokens, both read-only, set as Worker secrets:

| Secret | Type | Settings | Used for |
| --- | --- | --- | --- |
| `GH_TOKEN_PROFILE` | Classic personal access token | Scope `read:user` only | Commit totals including private contributions |
| `GH_TOKEN_REPOS` | Fine-grained personal access token | Resource owner: the profile owner. Repository access: all repositories. Permissions: Issues (read-only) and Pull requests (read-only). Metadata (read-only) is added automatically. | Pull request and issue counts including private repositories |

Why two: the private-inclusive contribution (commit) totals are only available through a classic token with `read:user`; fine-grained tokens can read private pull requests and issues but not those totals. A single classic token with `repo` could cover everything, but it is write-capable, so it is not used. Neither of the two tokens can write.

Troubleshooting: only if `npm run verify:tokens` reports low pull request or issue totals, also grant the fine-grained token Contents: read-only. This is not needed in the reference setup.

Set a 1-year expiry on both and add a calendar reminder to rotate them. When a token expires, the card keeps its last good version (it does not break) and Workers Logs show `refresh_failed`.

## Setup and deploy

1. Install dependencies: `npm install`. The scripts run as `node scripts/*.ts`, so they need Node with native TypeScript type stripping: Node 22.18 or later 22.x, or 23.6 and later (Node 23.0 to 23.5 lack it; developed on Node 24).
2. Copy `.dev.vars.example` to `.dev.vars` and fill in `GH_TOKEN_PROFILE` and `GH_TOKEN_REPOS`.
3. Check the tokens: `npm run verify:tokens` (calls GitHub and prints the totals; it exits non-zero if they are below the expected minimums). The login and minimums are hard-coded in `scripts/verify-tokens.ts`; adjust them for your own account.
4. Set `GITHUB_LOGIN` under `vars` in `wrangler.jsonc` to the profile to read.
5. Create a Cloudflare API token from the "Edit Cloudflare Workers" template and put it in a git-ignored `.env`:
   ```
   CLOUDFLARE_API_TOKEN=<your token>
   ```
6. Create the KV namespace and copy the printed id into the `kv_namespaces` entry of `wrangler.jsonc`:
   ```
   npx wrangler kv namespace create STATS
   ```
7. Deploy (builds the static assets, then `wrangler deploy`): `npm run deploy`
8. Store the tokens as Worker secrets (you are prompted for each value):
   ```
   npx wrangler secret put GH_TOKEN_PROFILE
   npx wrangler secret put GH_TOKEN_REPOS
   ```

The Worker is then live at `https://github-profile-cards.<your-subdomain>.workers.dev`. Until the secrets are set and the first cron run happens (next 00, 06, 12 or 18 UTC) the stats endpoints return the placeholder card; that run fills in the data.

## Using the images in a profile README

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://<worker-url>/stats-dark.svg">
  <img alt="GitHub stats" src="https://<worker-url>/stats-light.svg">
</picture>
```

Project cards use the same `<picture>` pattern (`/cards/<project>-dark.svg` and `-light.svg`). Tech-stack blocks have no dark variant, so a plain `<img>` is enough:

```html
<img alt="Backend stack" src="https://<worker-url>/stack/backend.svg">
```

## Development

| Command | What it does |
| --- | --- |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | Type-check the Worker and the scripts |
| `npm run build` | Generate `public/cards/*.svg` and `public/stack/*.svg` |
| `npm run gen:metrics` | Regenerate the Segoe UI text metrics (`src/render/metrics.json`) from local Windows fonts |
| `npm run vendor:icons` | Re-download the vendored skill and Simple Icons SVGs into `assets/icons/` |

Project card and tech-stack content lives in `src/content/`. `public/` is build output, generated by `npm run build` (run automatically by `npm run deploy`) and not committed.

## Troubleshooting

**The stats card is stuck on an old "updated" date and Workers Logs show `refresh_failed ... fell from X to Y` (or `... dropped to zero`).** The Worker rejects any all-time counter that falls sharply, in case GitHub returned bad data. If the drop is real (for example a private repository was transferred to a client organisation), it heals itself: after 4 identical rejected refreshes (about 24 hours at the 6-hourly cron) the new numbers are accepted, logged as `drop_accepted`, and the card updates. To accept immediately, delete the stored baseline and let the next cron store a fresh one:

```
npx wrangler kv key delete snapshot.json --binding STATS --remote
```

Wrangler 4 KV commands default to local storage, hence `--remote`.

## Security notes

- Tokens exist only as Worker secrets (and in your local, git-ignored `.dev.vars`). Never put them in `vars`, `wrangler.jsonc` or git.
- The stats endpoint has no parameters and never calls GitHub; it only reads KV. Only the cron job talks to GitHub.
- Accepted risk: the Worker URL is public, so direct requests could exhaust the free plan's 100k script requests per day. If that happens the stats card is down until 00:00 UTC; static assets (project cards, stack blocks) are not affected. The upgrade path is a custom domain plus a rate-limiting rule.

## Credits and licences

- The rank formula is ported from [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats) (MIT).
- Technology icons are vendored from [skill-icons](https://github.com/tandpfun/skill-icons) by tandpfun (MIT) in `assets/icons/skill`, with its licence alongside.
- Further icons come from [Simple Icons](https://simpleicons.org) (CC0) in `assets/icons/simple`.
- Text metrics in `src/render/metrics.json` are advance widths derived from Segoe UI, used for layout only. No font files are included.

This project is released under the [MIT licence](LICENSE).
