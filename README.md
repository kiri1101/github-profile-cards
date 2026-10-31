# github-profile-cards

A small Cloudflare Worker that powers a GitHub profile README: a self-hosted stats card and a most-used-languages card (both light and dark), plus project cards and tech-stack blocks, all as SVG.

## Why self-hosted

Public stats widgets only see public activity. A freelancer's client work lives in private repositories, so those cards undercount. This Worker uses two read-only tokens so the commit, pull request and issue totals include private work. The letter grade uses the `calculateRank` formula from github-readme-stats. The languages card adds up the language bytes of every repository you own, private ones included, forks excluded.

## What it does

- **Cron Trigger every 6 hours** (00, 06, 12, 18 UTC): fetches the stats from GitHub with both tokens, validates the result against the last stored snapshot, renders the light and dark cards and writes them to Workers KV. If a fetch or validation fails, nothing is overwritten: the card keeps its last good version and a `refresh_failed` event is logged.
- **Languages refresh, same cron:** sums GitHub's language bytes over the owned, non-fork repositories (public and private, following pagination) with `GH_TOKEN_REPOS`, keeps the top 6, and writes `langs-light.svg`, `langs-dark.svg` and `langs.json` to KV. It runs independently of the stats refresh: one failing never blocks or rolls back the other, each keeps its own last good card, and the languages refresh logs its own `langs_refresh_failed` event. If either one fails, the scheduled run is still marked as failed in Cloudflare's Cron events.
- **Fetch handler** serves only the stats and languages images from KV. It never calls GitHub.
- **Static assets** (project cards and tech-stack blocks) are generated at build time by `npm run build` and served as Workers static assets.

## Endpoints and assets

| Path | Source |
| --- | --- |
| `/stats-light.svg`, `/stats-dark.svg` | KV, `GET` and `HEAD` only. Before the first refresh, a placeholder "updating" card is served. |
| `/langs-light.svg`, `/langs-dark.svg` | KV, `GET` and `HEAD` only, same headers as the stats images. A 300×165 "Most Used Languages" card (top 6, percentages, footer "Incl. private repositories · updated {date}"). Before the first refresh, a placeholder "Languages are updating" card is served. |
| `/cards/<project>.svg` | Static assets (`public/cards/`), one self-theming SVG per project |
| `/stack/<group>.svg` | Static assets (`public/stack/`) |

The stats and languages endpoints take no parameters (a query string is ignored). Any other path under the Worker that is not a static asset returns 404; other methods on these paths return 405.

## Tokens

Two tokens, both read-only, set as Worker secrets:

| Secret | Type | Settings | Used for |
| --- | --- | --- | --- |
| `GH_TOKEN_PROFILE` | Classic personal access token | Scope `read:user` only | Commit totals including private contributions |
| `GH_TOKEN_REPOS` | Fine-grained personal access token | Resource owner: the profile owner. Repository access: all repositories. Permissions: Issues (read-only) and Pull requests (read-only). Metadata (read-only) is added automatically and also covers repository languages. | Pull request and issue counts, and language totals, including private repositories |

Why two: the private-inclusive contribution (commit) totals are only available through a classic token with `read:user`; fine-grained tokens can read private pull requests and issues but not those totals. A single classic token with `repo` could cover everything, but it is write-capable, so it is not used. Neither of the two tokens can write.

Troubleshooting: only if `npm run verify:tokens` reports low pull request or issue totals, also grant the fine-grained token Contents: read-only. This is not needed in the reference setup.

Set a 1-year expiry on both and add a calendar reminder to rotate them. When a token expires, the cards keep their last good version (they do not break) and Workers Logs show `refresh_failed` (stats) or `langs_refresh_failed` (languages).

## Setup and deploy

1. Install dependencies: `npm install`. The scripts run as `node scripts/*.ts`, so they need Node with native TypeScript type stripping: Node 22.18 or later 22.x, or 23.6 and later (Node 23.0 to 23.5 lack it; developed on Node 24).
2. Copy `.dev.vars.example` to `.dev.vars` and fill in `GH_TOKEN_PROFILE` and `GH_TOKEN_REPOS`.
3. Check the tokens: `npm run verify:tokens` (calls GitHub and prints the totals; it exits non-zero if they are below the expected minimums. It also checks that `GH_TOKEN_REPOS` can see your private repositories, printing only their count and the top 6 languages, and fails if the count is 0). The login and minimums are hard-coded in `scripts/verify-tokens.ts`; adjust them for your own account.
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

The Worker is then live at `https://github-profile-cards.<your-subdomain>.workers.dev`. Until the secrets are set and the first cron run happens (next 00, 06, 12 or 18 UTC) the stats and languages endpoints return their placeholder cards; that run fills in the data.

## Using the images in a profile README

The stats card and the languages card are embedded the same way. Stats first:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://<worker-url>/stats-dark.svg">
  <img alt="GitHub stats" src="https://<worker-url>/stats-light.svg">
</picture>
```

The languages card is not linked, so it takes `<picture>` the same way. It is 300×165, so set `height="165"`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://<worker-url>/langs-dark.svg">
  <img alt="Most used languages (incl. private repositories)" src="https://<worker-url>/langs-light.svg" height="165">
</picture>
```

Project cards are linked, so they are a plain `<a><img></a>`. Each card is one self-theming SVG: it carries both palettes and switches with the visitor's OS/browser colour preference through its own `@media (prefers-color-scheme: dark)` rule. Do not wrap a linked image in `<picture>` on GitHub: the README renderer splits `<a><picture><source><img></picture></a>`, putting the `<img>` in its own link to the raw image outside your anchor and dropping the `<img>` from the `<picture>`, so the click goes to the image and dark switching breaks.

```html
<a href="https://example.com/project"><img alt="Project" src="https://<worker-url>/cards/<project>.svg" width="410"></a>
```

Tech-stack blocks have no dark variant, so a plain `<img>` is enough:

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

**The stats card is stuck on an old "updated" date and Workers Logs show `refresh_failed ... fell from X to Y` (or `... dropped to zero`).** The Worker rejects any all-time counter that falls sharply, in case GitHub returned bad data. If the drop is real (for example a private repository was transferred to a client organisation), it heals itself: three refreshes are rejected, and the fourth that shows the same value for the dropped counter(s) is accepted (about 18 to 24 hours at the 6-hourly cron), logged as `drop_accepted`, and the card updates. A change in a dropped counter's value, or another counter newly dropping, restarts the count. To accept immediately, delete the stored baseline and let the next cron store a fresh one:

```
npx wrangler kv key delete snapshot.json --binding STATS --remote
```

Wrangler 4 KV commands default to local storage, hence `--remote`.

**The languages card shows a language you did not expect (for example a large JavaScript share).** GitHub counts committed build output and vendored bundles (such as a Nuxt `.output/` folder or `dist/`) in its language bytes. The fix is in the source repositories, not the Worker: add the folder to `.gitignore` (and untrack it with `git rm -r --cached`), or mark it in `.gitattributes`, for example `.output/** linguist-vendored`. In practice GitHub recalculated the repository languages within minutes of the push, and the card then updates on the next 6-hourly refresh.

## Security notes

- Tokens exist only as Worker secrets (and in your local, git-ignored `.dev.vars`). Never put them in `vars`, `wrangler.jsonc` or git.
- The stats and languages endpoints have no parameters and never call GitHub; they only read KV. Only the cron job talks to GitHub.
- Accepted risk: the Worker URL is public, so direct requests could exhaust the free plan's 100k script requests per day. If that happens the stats and languages cards are down until 00:00 UTC; static assets (project cards, stack blocks) are not affected. The upgrade path is a custom domain plus a rate-limiting rule.

## Credits and licences

- The rank formula is ported from [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats) (MIT).
- Technology icons are vendored from [skill-icons](https://github.com/tandpfun/skill-icons) by tandpfun (MIT) in `assets/icons/skill`, with its licence alongside.
- Further icons come from [Simple Icons](https://simpleicons.org) (CC0) in `assets/icons/simple`.
- Text metrics in `src/render/metrics.json` are advance widths derived from Segoe UI, used for layout only. No font files are included.

This project is released under the [MIT licence](LICENSE).
