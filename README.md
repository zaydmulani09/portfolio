# zayd.dpdns.org

Personal site of Zayd Mulani. Research, projects and writing, rebuilt from live
sources every six hours.

Nothing on the published site is a number typed by hand. Stars, releases, crate
and npm downloads, paper views, Hacker News points, post dates, commit activity
and the Pages for Change book counts are all fetched at build time. Prose lives
in `content.json` and `content/`.

## Layout

```
content.json          site copy: identity, papers, research draft, featured list
content/              per-project write-ups and the predictions table
build/build.mjs       fetch everything, render, write dist/
build/sources.mjs     every network call, each one allowed to fail
build/pages.mjs       HTML for every page, feeds, sitemap, search index
build/ui.mjs          shared head, header, footer and helpers
build/clean.mjs       cleans README and post HTML, copies images locally
build/og.mjs          one Open Graph image per page
build/check.mjs       checks the retry-storm explorer against the draft's numbers
site/                 static assets copied into dist/
site/v/<n>/           earlier versions, frozen
```

## Build

```bash
npm ci
node build/build.mjs               # live
node build/build.mjs --save-cache  # live, and keep a snapshot in build/cache.json
node build/build.mjs --offline     # from the snapshot, for layout work
npx serve dist
```

| Variable | Effect if missing |
| --- | --- |
| `GITHUB_TOKEN` | API limit drops to 60 an hour and the activity bars are skipped |
| `VERCEL_TOKEN` | demo URLs fall back to each repo's homepage field |

## Sources

| Source | Used for |
| --- | --- |
| GitHub REST and GraphQL | repos, stars, releases, READMEs, latest commits, 30 days of activity |
| Zenodo | paper titles, abstracts, keywords, PDFs, views and downloads |
| Crossref | SSRN posting dates |
| dev.to | full posts, copied here with images |
| crates.io, npm | package versions and downloads |
| Hacker News (Algolia) | points on submissions |
| pagesforchange.org/llms.txt | books collected and other public counts |

If a source fails, the build reuses the matching part of the live
`/build.json` and says so in the footer. It exits non-zero only when the repo
list or the paper metadata is missing with nothing to fall back on, so a bad
run leaves the previous deploy up.

## Privacy

No cookies, no analytics, no third-party requests on load. The simulations load
in a frame only after a "Run it here" click, and the Content Security Policy
allows those origins and nothing else. `localStorage` holds only the theme
choice.

## Paths

| Path | What |
| --- | --- |
| `/research/` | papers, the retry-storm draft, predictions and outcomes, timeline |
| `/research/<slug>/` | abstract, BibTeX, links per paper |
| `/projects/` and `/projects/<repo>/` | every public repo, with write-ups for the main ones |
| `/writing/` and `/writing/<slug>/` | posts |
| `/feed.xml`, `/releases.xml` | Atom feeds for posts and releases |
| `/search.json` | index for the command palette (Ctrl K or /) |
| `/build.json` | the data the site was rendered from |
| `/v/<n>/` | earlier versions, `noindex` |

## Deploy

GitHub Pages through `.github/workflows/deploy.yml`, on every push to `main`
and every six hours.

Hanken Grotesk is under the OFL, in `site/fonts/`.
