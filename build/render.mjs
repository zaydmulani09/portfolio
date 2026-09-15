const ORIGIN = 'https://zayd.dpdns.org';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '');

// "1 star", not "1 stars". Applies to every count the page prints, all of
// which come from an API and can legitimately be 1.
const plural = (n, one, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `<time datetime="${esc(d.toISOString())}" data-rel>${d.toISOString().slice(0, 10)}</time>`;
}

const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;

// Facts read as a sentence, not a row of chips. Every one of them is fetched.
function factLine(parts) {
  const kept = parts.filter(Boolean);
  return kept.length ? `<p class="facts">${kept.join(', ')}.</p>` : '';
}

/* ------------------------------------------------------------------ head */

function head(c) {
  const title = c.identity.name;
  const desc = c.identity.line;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0d0f0e">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${ORIGIN}/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:image" content="${ORIGIN}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ORIGIN}/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="Releases" href="/releases.xml">
<link rel="preload" as="font" type="font/woff2" href="/fonts/public-sans-400.woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

/* ------------------------------------------------------------------- bar */

// The top bar: name, profile links, and the h-card. Nothing on this page
// autoplays; every demo waits for a click.
function bar(c, hasCraft) {
  return `
<div class="bar h-card">
  <p class="who"><a class="u-url p-name" href="/" rel="me">${esc(c.identity.name)}</a></p>
  <nav aria-label="Profiles">${c.identity.links
    .map((l) => `<a class="u-url" rel="me" href="${esc(l.href)}">${esc(l.label)}</a>`)
    .join('')}<a class="u-email" rel="me" href="mailto:${esc(
    c.identity.email,
  )}">email</a>${hasCraft ? link('/craft', 'craft') : ''}${link('/archive', c.version.label)}</nav>
  <p class="p-note sr-only">${esc(c.identity.line)}</p>
  <span class="p-locality sr-only">${esc(c.identity.location)}</span>
</div>
<h1 class="sr-only">${esc(c.identity.name)}</h1>`;
}

/* ----------------------------------------------------------------- pulse */

// A month of commits, one bar a day, from the same data as the contribution
// graph on the GitHub profile, plus the newest commit message as written.
// The unit comes from the source: commits from the graph, or pushes when the
// build had to fall back to the events feed. The copy never upgrades one into
// the other.
function pulse(p) {
  if (!p?.series?.length) return '';
  const peak = Math.max(...p.series.map((d) => d.count), 1);
  const one = p.unit === 'push' ? 'push' : 'commit';
  const unit = (n) => plural(n, one, one === 'push' ? 'pushes' : 'commits');

  const bars = p.series
    .map((d) => {
      const h = d.count ? Math.max(9, Math.round((d.count / peak) * 100)) : 2;
      const label = d.count ? `${unit(d.count)} on ${d.day}` : `nothing on ${d.day}`;
      return `<span class="tick${d.count ? '' : ' tick-none'}" style="height:${h}%" title="${esc(label)}"></span>`;
    })
    .join('');

  const quiet = p.series.filter((d) => !d.count).length;
  const read = quiet
    ? `${unit(p.total)} in the last ${plural(p.days, 'day')}, ${plural(quiet, 'day')} with none.`
    : `${unit(p.total)} in the last ${plural(p.days, 'day')}, at least one on each.`;

  return `
<aside class="pulse" aria-label="${esc(`${one === 'push' ? 'Push' : 'Commit'} activity over the last ${plural(p.days, 'day')}`)}">
  <div class="bars" role="img" aria-label="${esc(read)}">${bars}</div>
  <p class="pulse-read">${esc(read)}</p>
  ${
    p.newest
      ? `<p class="pulse-last"><span class="dim">Latest commit, in ${esc(p.newest.repo)}, ${when(
          p.newest.at,
        )}:</span> <q>${esc(p.newest.message)}</q></p>`
      : ''
  }
</aside>`;
}

/* ---------------------------------------------------------------- recent */

// The most recently pushed repositories that are not already in the project
// list, unfinished ones included. Description from GitHub or the README.
function recent(c, repos) {
  const listed = new Set(c.projects.map((p) => p.repo));
  const rows = repos
    .filter((r) => !listed.has(r.name))
    .slice(0, c.recentLimit)
    .map(
      (r) =>
        `<li>${link(r.url, r.name)}${r.description ? ` ${esc(r.description)}` : ''} <span class="dim">${
          r.language ? `${esc(r.language)}, ` : ''
        }pushed ${when(r.pushedAt)}</span></li>`,
    )
    .join('');
  if (!rows) return '';

  return `
<section class="block" aria-labelledby="recent-h">
  <h2 id="recent-h">${esc(c.sections.recent)}</h2>
  <ul class="loose">${rows}</ul>
</section>`;
}

/* -------------------------------------------------------------- projects */

// One list, one entry per project, in the order content.json gives them.
// The note is hand-written; language, stars, release, downloads, licence and
// the last push date are fetched. A project with a deployment that allows
// framing gets a button that mounts it in place.
function projects(c, urlFor, repoFor, detail, crates) {
  const items = c.projects
    .map((p) => {
      const r = repoFor(p.repo);
      if (!r) return '';
      const d = detail[p.repo] || {};
      const cr = p.crate ? crates[p.crate] || null : null;
      const url = urlFor(p.repo);
      const run =
        p.embed && url
          ? `<button type="button" class="run" data-src="${esc(url)}" data-title="${esc(p.repo)}">Run it here</button>`
          : '';

      return `
<article class="work" id="${esc(p.repo)}">
  <h3>${link(r.url, p.repo)}</h3>
  <p>${esc(p.note)}</p>
  ${factLine([
    r.language ? esc(r.language) : '',
    r.stars ? plural(r.stars, 'star') : '',
    d.release ? `latest release ${link(d.release.url, d.release.tag)}` : '',
    cr ? `${plural(cr.downloads, 'download')} on crates.io` : '',
    r.license ? esc(r.license) : '',
    r.pushedAt ? `last pushed ${when(r.pushedAt)}` : '',
  ])}
  ${p.embedNote ? `<p class="facts">${esc(p.embedNote)}</p>` : ''}
  ${run || url ? `<p class="actions">${run}${url ? link(url, 'Open it') : ''}</p>` : ''}
</article>`;
    })
    .join('');

  return `
<section class="block" aria-labelledby="projects-h">
  <h2 id="projects-h">${esc(c.sections.projects)}</h2>
  ${items}
</section>`;
}

/* --------------------------------------------------------------- writing */

// Posts from dev.to and threads on Hacker News, dated and counted by those
// sites, not by me.
function writing(c, hn, posts) {
  const rows = [];
  for (const h of hn || [])
    rows.push(
      `<li>${link(h.url, h.title)} <span class="dim">${plural(h.points, 'point')} on Hacker News, ${when(
        h.createdAt,
      )}</span></li>`,
    );
  for (const p of (posts || []).slice(0, 6))
    rows.push(`<li>${link(p.url, p.title)} <span class="dim">${when(p.publishedAt)}</span></li>`);
  if (!rows.length) return '';

  return `
<section class="block" aria-labelledby="writing-h">
  <h2 id="writing-h">${esc(c.sections.writing)}</h2>
  <ul class="loose">${rows.join('')}</ul>
</section>`;
}

/* ------------------------------------------------------------------ foot */

function foot(c, meta) {
  const errs = meta.errors.length
    ? `<p class="warn">Some of this page is stale: ${meta.errors
        .map((e) => `${esc(e.source)} failed with ${esc(e.error)}`)
        .join('; ')}.</p>`
    : '';
  return `
<footer class="foot">
  <p>${esc(c.identity.name)}, ${esc(c.identity.location)}. ${esc(c.identity.status)}</p>
  <p class="dim">A script fetched the numbers on this page from the GitHub, Vercel, dev.to, crates.io and Hacker News APIs ${when(
    meta.generatedAt,
  )} and wrote this file; it runs again every six hours. ${link('/build.json', 'build.json')} holds the data it used, ${link(
    '/releases.xml',
    'releases.xml',
  )} lists tagged releases, and ${link(
    'https://github.com/zaydmulani09/portfolio',
    'the source is on GitHub',
  )}. The page sets no cookies and loads nothing from a third party until you press Run.</p>
  ${errs}
</footer>`;
}

/* ------------------------------------------------------------------ page */

export function page(c, data, meta) {
  const byRepo = new Map(data.repos.map((r) => [r.name.toLowerCase(), r]));
  const byProject = new Map((data.projects || []).map((p) => [p.name.toLowerCase(), p]));

  const urlFor = (name) => byProject.get(String(name).toLowerCase())?.url || '';
  const repoFor = (name) => byRepo.get(String(name).toLowerCase()) || null;
  const hasCraft = craftEntries(c, data.repos).length > 0;

  return `${head(c)}
${bar(c, hasCraft)}
<main id="main">
  <div class="intro">
    ${c.intro.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
  </div>
${pulse(data.pulse)}
${projects(c, urlFor, repoFor, data.detail, data.crates)}
${recent(c, data.repos)}
${writing(c, data.hn, data.posts)}
</main>
${foot(c, meta)}
<script src="/app.js" defer></script>
</body>
</html>
`;
}

/* ----------------------------------------------------------------- craft */

// Anything tagged with the craft topic on GitHub shows up here. The topic is
// the only thing to maintain: tag a repo once and the next build picks it up.
export function craftEntries(c, repos) {
  return repos
    .filter((r) => (r.topics || []).includes(c.craft.topic))
    .sort((a, b) => new Date(b.createdAt || b.pushedAt) - new Date(a.createdAt || a.pushedAt));
}

function craftRow(r, urlFor) {
  const made = new Date(r.createdAt || r.pushedAt);
  const stamp = made.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const live = urlFor(r.name);
  return `
<li>
  <span class="craft-when">${esc(stamp)}</span>
  <span class="craft-what">
    <strong>${link(r.url, r.name)}</strong>
    ${r.description ? ` ${esc(r.description)}` : ''}
  </span>
  ${live ? `<span class="craft-go">${link(live, 'run it')}</span>` : '<span class="craft-go dim">code only</span>'}
</li>`;
}

export function craftPage(c, data) {
  const byProject = new Map((data.projects || []).map((p) => [p.name.toLowerCase(), p]));
  const urlFor = (n) => byProject.get(String(n).toLowerCase())?.url || '';
  const all = craftEntries(c, data.repos);

  return `${head(c).replace('<title>', '<title>Craft, ')}
<div class="bar">
  <p class="who">${link('/', c.identity.name)}</p>
  <nav aria-label="Profiles">${link('/', 'back to the front')}</nav>
</div>
<main id="main">
  <div class="intro"><p>${esc(c.craft.pageIntro)}</p></div>
  <section class="block" aria-labelledby="all-h">
    <h1 id="all-h">${esc(c.craft.heading)}</h1>
    <p class="lead">${esc(plural(all.length, 'thing'))}, newest first.</p>
    <ul class="craft">${all.map((r) => craftRow(r, urlFor)).join('')}</ul>
  </section>
</main>
<footer class="foot"><p>${esc(c.identity.name)}, ${esc(c.identity.location)}.</p></footer>
</body>
</html>
`;
}

/* --------------------------------------------------------------- archive */

export function archive(c, meta) {
  const rows = c.version.past
    .map(
      (v) => `
<article class="work">
  <h2>${link(v.path, `v.${v.n}`)}</h2>
  <p>${esc(v.note)}</p>
  <p class="facts">Retired ${when(v.retired)}. Still served at ${link(v.path, v.path)}, unchanged.</p>
</article>`,
    )
    .join('');

  return `${head(c).replace('<title>', '<title>Archive, ')}
<div class="bar">
  <p class="who">${link('/', c.identity.name)}</p>
  <nav aria-label="Profiles">${link('/', 'back to the current one')}</nav>
</div>
<main id="main">
  <div class="intro">
    <p>Old versions of this site stay up at their own paths. I keep them as a record of what I thought looked good at the time.</p>
    <p>This is ${esc(c.version.label)}, running now.</p>
  </div>
  <section class="block" aria-labelledby="old-h">
    <h1 id="old-h">Previous versions</h1>
    <p class="lead">Frozen, unindexed, still served.</p>
    ${rows}
  </section>
</main>
<footer class="foot"><p>${esc(c.identity.name)}, ${esc(c.identity.location)}.</p></footer>
</body>
</html>
`;
}

/* ------------------------------------------------------------- atom feed */

export function feed(c, releases) {
  const entries = releases
    .map(
      (r) => `  <entry>
    <title>${esc(r.repo)} ${esc(r.tag)}</title>
    <link href="${esc(r.url)}"/>
    <id>${esc(r.url)}</id>
    <updated>${esc(new Date(r.publishedAt).toISOString())}</updated>
    <summary>${esc(r.repo)} released ${esc(r.tag)}.</summary>
  </entry>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(c.identity.name)} releases</title>
  <link href="${ORIGIN}/releases.xml" rel="self"/>
  <link href="${ORIGIN}/"/>
  <id>${ORIGIN}/releases.xml</id>
  <updated>${new Date().toISOString()}</updated>
  <author><name>${esc(c.identity.name)}</name></author>
${entries}
</feed>
`;
}

export function sitemap(hasCraft = false) {
  return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${ORIGIN}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>
  <url><loc>${ORIGIN}/archive</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>${
    hasCraft
      ? `\n  <url><loc>${ORIGIN}/craft</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`
      : ''
  }
</urlset>
`;
}
