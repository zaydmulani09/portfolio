# zayd.dpdns.org

> Repo description to update on GitHub: **Personal site. Live GPU demos embedded
> from their own deployments, with every number fetched from an API at build time.**
> (The current one still says "Astro static, self-hosted IBM Plex, no client JS",
> none of which is true any more.)

A one-page site where the work runs in the page, generated from live APIs.

Three of the browser projects mount their real Vercel deployment in place from a
"Run it here" button. Nothing runs until you press it.

Nothing on the published page is a number I typed. Star counts, release tags,
crate downloads, deploy states, deployment URLs, last-push dates, Hacker News
points, and post dates are all fetched at build time. Prose lives in
`content.json` and nowhere else.

## Layout

```
content.json                  the only hand-written copy on the site
build/build.mjs               fetch, render, write dist/
build/sources.mjs             every network call, each one allowed to fail
build/render.mjs              HTML, Atom feed, sitemap
build/fixture.json            offline snapshot for layout work
site/                         static assets copied verbatim into dist/
dist/                         generated, gitignored, never committed
```

## Build

```bash
node build/build.mjs             # live
node build/build.mjs --fixture   # offline, from build/fixture.json
npx serve dist                   # asset paths are absolute, so serve it
```

### Environment

| Variable | Needed | Effect if missing |
| --- | --- | --- |
| `GITHUB_TOKEN` | optional | API limit drops from 5000/hr to 60/hr |
| `VERCEL_TOKEN` | optional | the `live` table is skipped and the page says why |
| `VERCEL_TEAM_ID` | optional | only for team-scoped projects |

In Actions `GITHUB_TOKEN` is supplied automatically. `VERCEL_TOKEN` is a repo
secret: create it at vercel.com/account/tokens with read scope.

## Failure behaviour

The GitHub repo list is the spine of the page. If it fails the build exits
non-zero and the previous deploy stays up, because a portfolio with no work on
it is worse than a stale one.

Everything else degrades. A failed source leaves its section out, records the
reason in `build.json`, and prints it in the colophon under "source status on
this build". A visitor can see which parts of the page are stale and why.

## Descriptions

A repo row shows, in order of preference:

1. an entry in `content.json` under `web.note`
2. the GitHub repo description
3. the first real line of the repo README, with badges, headings, images, and
   em dashes stripped

So setting a GitHub description once, or writing a decent tagline at the top of
a README, is enough. Nothing needs to be restated here.

## Deploy

GitHub Pages, via `.github/workflows/deploy.yml`. Runs on every push to `main`
and on a six-hour cron, because the page goes stale on its own even when this
repo does not change.

## Published paths

| Path | What |
| --- | --- |
| `/` | the site |
| `/archive` | every previous version of this site |
| `/v/<n>/` | version `n`, frozen, `noindex`, still served |
| `/build.json` | the exact payload the page was rendered from |
| `/releases.xml` | Atom feed of tagged releases |

## Craft log

Anything on GitHub carrying the `craft` topic appears at `/craft`, linked from
the top bar, newest first, dated by when the repo was created. Tag a repo once and the next build picks it up; there is no
list to maintain here.

If a Vercel deployment shares the repo's name, the entry gets a "run it" link.
Otherwise it says "code only". If no repo is tagged, the page is not built and
nothing links to it.

## Microformats

The header is marked up as an [h-card](https://microformats.org/wiki/h-card)
with `p-name`, `u-url`, `u-email`, `p-note` and `p-locality`, and every profile
link carries `rel="me"`. For `rel="me"` to verify in both directions, each
linked profile has to link back to `https://zayd.dpdns.org`. GitHub does this
via the website field on your profile.

## Versioning

`content.json` holds `version.current` and a `version.past` list. When you
redesign:

1. Copy the current `site/` into `site/v/<current>/`, rewrite its asset paths to
   absolute `/v/<n>/...`, and add a `noindex` robots meta plus the banner.
2. Bump `version.current`, add an entry to `version.past` with an honest note
   about what was wrong with it.

Old versions are never deleted. `/v/` is disallowed in robots.txt so the frozen
copies do not compete with the live page in search.

## Notes

- No framework, no dependencies, no build tooling. `node build/build.mjs` is
  the whole pipeline.
- Two self-hosted font files, subset to the characters actually used, 15 kB
  total. No font CDN.
- ~1.7 kB of client JavaScript: relative dates, and mounting the demos. The
  page is readable and complete with it blocked.
- Nothing third-party loads until a demo is mounted. A visitor who never
  presses run makes no request off this origin.
- No analytics, no cookies, no third-party requests.
- Fonts are Commit Mono and Public Sans, both OFL-1.1. Licences are in
  `site/fonts/`.

## Embedding rules

A demo can only be embedded if its deployment allows framing. Checked at build
time by hand, not automatically:

- `slimeroute`, `seewifi`, `xorcery` set no `X-Frame-Options` and no
  `frame-ancestors`, so they frame fine.
- `quivercam` sets `Permissions-Policy: camera=(self)`, which means camera
  access is refused to any embedding origin. It can never run in a frame here
  and is marked `"embed": false` in `content.json`, with the reason shown on
  the page.

If a deployment stops answering, the script detects it with a `no-cors` fetch
before mounting and swaps the frame for a sentence and a link. It does not
leave a black box.

## Deploying this the first time

The old workflow uploaded `site/` as-is with no build step. This one runs
`node build/build.mjs` first and publishes `dist/`, so two things have to be
right:

1. **Settings → Pages → Source** must be **GitHub Actions**, not a branch.
   It already is if `github-pages` shows under Deployments.
2. **Settings → Secrets and variables → Actions → New repository secret**
   `VERCEL_TOKEN`, made at vercel.com/account/tokens with read scope. Without
   it the build still succeeds, and the deploy table says it is stale rather
   than going blank.

`GITHUB_TOKEN` is injected by Actions automatically. Nothing else to configure.

To watch it: Actions tab → "Build and deploy". The build log prints the repo
count, deployment count, and the number of sources that failed.
