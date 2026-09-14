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



/* ------------------------------------------------------------------ craft */

// Anything tagged with the craft topic on GitHub shows up here. The topic is
// the only thing to maintain: tag a repo once and the next build picks it up.
function craftEntries(c, repos) {
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

function craft(c, repos, urlFor) {
  const all = craftEntries(c, repos);
  if (!all.length) return '';
  const shown = all.slice(0, 4);

  return `
<section class="block" aria-labelledby="craft-h">
  <h2 id="craft-h">${esc(c.craft.heading)}</h2>
  <p class="lead">${esc(c.craft.lead)}</p>
  <ul class="craft">${shown.map((r) => craftRow(r, urlFor)).join('')}</ul>
  ${all.length > shown.length ? `<p class="actions">${link('/craft', `All ${num(all.length)} of them`)}</p>` : ''}
</section>`;
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

/* ----------------------------------------------------------------- pulse */

// A month of commits, one bar a day, plus whatever I last typed into a commit
// message. It is not a metric anybody should be impressed by. It is just what
// the last month actually looked like, including the empty days. The unit
// comes from the source: commits from the contribution graph, or pushes when
// the build had to fall back to the events feed. The copy never upgrades one
// into the other.
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

  return `
<aside class="pulse" aria-label="${esc(`${one === 'push' ? 'Push' : 'Commit'} activity over the last ${plural(p.days, 'day')}`)}">
  <div class="bars" role="img" aria-label="${esc(
    `${unit(p.total)} over ${plural(p.days, 'day')}, with ${plural(quiet, 'day')} of nothing`,
  )}">${bars}</div>
  <p class="pulse-read">${esc(unit(p.total))} in ${esc(plural(p.days, 'day'))}.${
    quiet
      ? ` ${esc(plural(quiet, 'day'))} of that I wrote nothing at all.`
      : ' I wrote something every single day, which is not normal.'
  }</p>
  ${
    p.newest
      ? `<p class="pulse-last"><span class="dim">Last thing I wrote, in ${esc(
          p.newest.repo,
        )}, ${when(p.newest.at)}:</span> <q>${esc(p.newest.message)}</q></p>`
      : ''
  }
</aside>`;
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

/* ------------------------------------------------------------------ hero */

// The frame holds the real deployment, not a recording. If it cannot paint,
// because there is no GPU, or the project is down, the caption and the link
// still stand, which is why the caption sits outside the frame.
function hero(c, urlFor, hasCraft) {
  const url = urlFor(c.hero.project);
  const repo = `https://github.com/zaydmulani09/${c.hero.project}`;

  const stage = url
    ? `<div class="stage" data-src="${esc(url)}" data-title="${esc(c.hero.project)}">
      <noscript><p class="stage-note">${esc(c.hero.fallback)} ${link(url, 'Open it')}</p></noscript>
    </div>`
    : `<div class="stage stage-down"><p class="stage-note">The Vercel API did not answer this build, so the demo is not embedded here. ${link(
        repo,
        'The source is here',
      )}.</p></div>`;

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

<section class="hero">
  <h1 class="sr-only">${esc(c.identity.name)}</h1>
  ${stage}
  <div class="stage-caption">
    <p>${esc(c.hero.caption)}</p>
    <p class="actions">${url ? link(url, 'Open it full screen') : ''}${link(repo, 'Read the source')}</p>
  </div>
</section>`;
}

/* --------------------------------------------------------------- browser */

function browser(c, urlFor, repoFor) {
  const items = c.browser
    .map((b) => {
      const r = repoFor(b.project) || {};
      const url = urlFor(b.project);
      const repo = r.url || `https://github.com/zaydmulani09/${b.project}`;

      const isHero = b.project === c.hero.project;
      const run =
        !isHero && b.embed && url
          ? `<button type="button" class="run" data-src="${esc(url)}" data-title="${esc(b.project)}">Run it here</button>`
          : '';
      const note = isHero
        ? `<p class="facts">This is the one running at the top of the page.</p>`
        : b.embedNote
          ? `<p class="facts">${esc(b.embedNote)}</p>`
          : '';

      return `
<article class="work" id="${esc(b.project)}">
  <h3>${esc(b.project)}</h3>
  <p>${esc(b.note)}</p>
  ${factLine([
    r.language ? esc(r.language) : '',
    r.stars ? plural(r.stars, 'star') : '',
    r.pushedAt ? `last pushed ${when(r.pushedAt)}` : '',
  ])}
  ${note}
  <p class="actions">${run}${url ? link(url, 'Open it') : ''}${link(repo, 'Source')}</p>
</article>`;
    })
    .join('');

  return `
<section class="block" aria-labelledby="run-h">
  <h2 id="run-h">${esc(c.sections.browser)}</h2>
  <p class="lead">No install, no account, nothing uploaded. The interesting part happens on your own GPU, which is also why none of them need a server.</p>
  ${items}
</section>`;
}

/* --------------------------------------------------------------- install */

function install(c, repoFor, detail, crates) {
  const items = c.featured
    .map((f) => {
      const r = repoFor(f.repo);
      if (!r) return '';
      const d = detail[f.repo] || {};
      const cr = crates[f.crate] || null;

      return `
<article class="work">
  <h3>${link(r.url, f.repo)}</h3>
  <p>${esc(f.note)}</p>
  ${factLine([
    r.language ? esc(r.language) : '',
    r.stars ? plural(r.stars, 'star') : '',
    d.release ? `latest release ${link(d.release.url, d.release.tag)}` : 'no tagged release yet',
    cr ? `${plural(cr.downloads, 'download')} on crates.io` : '',
    r.license ? esc(r.license) : '',
    r.pushedAt ? `last pushed ${when(r.pushedAt)}` : '',
  ])}
  ${
    d.head
      ? `<p class="commit">Most recent commit ${link(d.head.url, d.head.sha)}: ${esc(d.head.message)}</p>`
      : ''
  }
</article>`;
    })
    .join('');

  return `
<section class="block" aria-labelledby="install-h">
  <h2 id="install-h">${esc(c.sections.install)}</h2>
  <p class="lead">Single binaries, mostly Rust, mostly for people building on top of language models.</p>
  ${items}
</section>`;
}

/* ------------------------------------------------------------------ rest */

function alsoUp(c, projects, repoFor) {
  if (!projects?.length) return '';
  const skip = new Set((c.web.skip || []).map((s) => s.toLowerCase()));
  const rows = projects
    .filter((p) => !skip.has(p.name.toLowerCase()))
    .map((p) => {
      const note =
        c.web.note?.[p.name] ||
        repoFor(p.repo || p.name)?.description ||
        repoFor(p.name)?.description ||
        '';
      const broken = p.state && p.state !== 'READY';
      return `<li>${link(p.url, p.name)}${note ? ` ${esc(note)}` : ''}${
        broken ? ` <span class="warn">This deploy is failing right now and I have not fixed it.</span>` : ''
      }</li>`;
    })
    .join('');

  return `
<section class="block" aria-labelledby="up-h">
  <h2 id="up-h">${esc(c.sections.up)}</h2>
  <p class="lead">Older or smaller, still deployed. Read from the Vercel API, failures included.</p>
  <ul class="loose">${rows}</ul>
</section>`;
}

function pushed(c, repos) {
  const shown = new Set([...c.featured.map((f) => f.repo), ...c.browser.map((b) => b.project)]);
  const rows = repos
    .filter((r) => !shown.has(r.name))
    .slice(0, c.recentLimit)
    .map(
      (r) =>
        `<li>${link(r.url, r.name)}${r.description ? ` ${esc(r.description)}` : ''} <span class="dim">${
          r.language ? `${esc(r.language)}, ` : ''
        }last pushed ${when(r.pushedAt)}</span></li>`,
    )
    .join('');

  return `
<section class="block" aria-labelledby="pushed-h">
  <h2 id="pushed-h">${esc(c.sections.pushed)}</h2>
  <p class="lead">Unfiltered and in order. Some of it is unfinished, and some of it will stay that way.</p>
  <ul class="loose">${rows}</ul>
</section>`;
}

function elsewhere(hn, posts) {
  const rows = [];
  for (const h of hn || [])
    rows.push(
      `<li>${link(h.url, h.title)} <span class="dim">${plural(h.points, 'point')} on Hacker News, ${when(
        h.createdAt,
      )}</span></li>`,
    );
  for (const p of (posts || []).slice(0, 5))
    rows.push(`<li>${link(p.url, p.title)} <span class="dim">${when(p.publishedAt)}</span></li>`);
  if (!rows.length) return '';

  return `
<section class="block" aria-labelledby="else-h">
  <h2 id="else-h">Written up, and argued about</h2>
  <p class="lead">Threads and posts that other people counted, rather than numbers I picked.</p>
  <ul class="loose">${rows.join('')}</ul>
</section>`;
}

function tail(c, meta) {
  c = { ...c, limits_heading: c.sections.limits, how_heading: c.sections.how };
  const errs = meta.errors.length
    ? `<p class="warn">Some of this page is stale: ${meta.errors
        .map((e) => `${esc(e.source)} failed with ${esc(e.error)}`)
        .join('; ')}.</p>`
    : '';

  return `
<section class="block" aria-labelledby="limits-h">
  <h2 id="limits-h">${esc(c.limits_heading)}</h2>
  <ul class="loose">${c.limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
</section>

<section class="block" aria-labelledby="how-h">
  <h2 id="how-h">${esc(c.how_heading)}</h2>
  <p>A Node script with no dependencies fetched every number above from the GitHub, Vercel, dev.to, crates.io, and Hacker News APIs and then wrote this file. It last ran ${when(
    meta.generatedAt,
  )}, and runs again on every push and every six hours. Star counts, release tags, deploy states and dates are never typed by hand, so either they are right or the page tells you which source failed.</p>
  <p>The demos are the live deployments in a frame, not recordings. ${link(
    '/build.json',
    'build.json',
  )} holds the exact data this page was rendered from, ${link(
    '/releases.xml',
    'releases.xml',
  )} is a feed of tagged releases, and ${link(
    'https://github.com/zaydmulani09/portfolio',
    'the source is here',
  )}.</p>
  <p class="dim">Static files on GitHub Pages. ${esc(plural(meta.fontFiles, 'self-hosted font file'))}, ${esc(
    meta.fontBytes,
  )}. ${esc(
    meta.jsBytes,
  )} of JavaScript, which relativises dates and starts the demos. No analytics, no cookies, no third-party requests until you press run.</p>
  ${errs}
</section>`;
}

/* ------------------------------------------------------------------ page */

export function page(c, data, meta) {
  const byRepo = new Map(data.repos.map((r) => [r.name.toLowerCase(), r]));
  const byProject = new Map((data.projects || []).map((p) => [p.name.toLowerCase(), p]));

  const urlFor = (name) => byProject.get(String(name).toLowerCase())?.url || '';
  const repoFor = (name) => byRepo.get(String(name).toLowerCase()) || null;

  return `${head(c)}
${hero(c, urlFor, craftEntries(c, data.repos).length > 0)}
<main id="main">
  <div class="intro">
    <p>${esc(c.notes[0])}</p>
    <p>${esc(c.notes[1])}</p>
  </div>
${pulse(data.pulse)}
${browser(c, urlFor, repoFor)}
${install(c, repoFor, data.detail, data.crates)}
${craft(c, data.repos, urlFor)}
${alsoUp(c, data.projects, repoFor)}
${pushed(c, data.repos)}
${elsewhere(data.hn, data.posts)}
${tail(c, meta)}
</main>
<footer class="foot">
  <p>${esc(c.identity.name)}, ${esc(c.identity.location)}. ${esc(c.identity.status)}</p>
</footer>
<script src="/app.js" defer></script>
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
  <p class="facts">Retired ${when(v.retired)}. Still live at ${link(v.path, v.path)}, exactly as it was.</p>
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
    <p>Every version of this site stays up. Nothing gets deleted when I redesign, because the old ones are a fair record of what I thought was good at the time, and some of them are embarrassing.</p>
    <p>This is ${esc(c.version.label)}, running now.</p>
  </div>
  <section class="block" aria-labelledby="old-h">
    <h1 id="old-h">I used to look like this.</h1>
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
