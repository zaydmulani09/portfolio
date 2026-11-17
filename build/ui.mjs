import { createHash } from 'node:crypto';

export const ORIGIN = 'https://zayd.dpdns.org';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const num = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n ?? ''));
export const plural = (n, one, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;

const fmt = (iso, opts) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
export const dateText = (iso) => fmt(iso, { month: 'short', day: 'numeric', year: 'numeric' });
export const monthText = (iso) => fmt(iso, { month: 'short', year: 'numeric' });
export const when = (iso, text = dateText) => (iso ? `<time datetime="${esc(new Date(iso).toISOString().slice(0, 10))}">${esc(text(iso))}</time>` : '');

export const link = (href, text, attrs = '') => `<a href="${esc(href)}"${attrs ? ` ${attrs}` : ''}>${esc(text)}</a>`;

export const THEME_SCRIPT =
  "document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}";

const scriptHash = (s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;

export function picture(ctx, file, { sizes = '100vw', eager = false, cls = '', alt } = {}) {
  const big = ctx.images.get(file);
  if (!big) return '';
  const smallName = file.replace(/-(1600|1200)\.webp$/, (m, w) => (w === '1600' ? '-800.webp' : '-600.webp')).replace(/^(p4c\/p4c-\d)\.webp$/, '$1-800.webp');
  const small = smallName !== file ? ctx.images.get(smallName) : null;
  const srcset = small ? ` srcset="/img/${esc(smallName)} ${small.width}w, /img/${esc(file)} ${big.width}w" sizes="${esc(sizes)}"` : '';
  return `<img${cls ? ` class="${cls}"` : ''} src="/img/${esc(file)}"${srcset} width="${big.width}" height="${big.height}" alt="${esc(alt ?? big.alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

export function head(ctx, { title, description, path, og, type = 'website', extra = '', jsonld = [] }) {
  const c = ctx.c;
  const full = title ? `${title} | ${c.identity.name}` : `${c.identity.name}: research, Rust tools and GPU simulations`;
  const url = `${ORIGIN}${path}`;
  const image = `${ORIGIN}${og || '/og/home.png'}`;
  const frames = [...new Set(ctx.simUrls.map((u) => new URL(u).origin))].join(' ');
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${scriptHash(THEME_SCRIPT)}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${frames}`,
    `frame-src ${frames || "'none'"}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${esc(csp)}">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(c.identity.name)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#ddd6c6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161712" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(c.identity.name)}">
<meta property="og:title" content="${esc(title || c.identity.name)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title || c.identity.name)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="Writing" href="/feed.xml">
<link rel="alternate" type="application/atom+xml" title="Releases" href="/releases.xml">
<link rel="preload" as="font" type="font/woff2" href="/fonts/hanken-grotesk.woff2" crossorigin>
<link rel="stylesheet" href="${esc(ctx.assets.css)}">
<script>${THEME_SCRIPT}</script>
${extra}${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>`;
}

const NAV = [
  ['/research/', 'Research'],
  ['/projects/', 'Projects'],
  ['/writing/', 'Writing'],
  ['/#contact', 'Contact'],
];

export function top(ctx, { field = '', path = '' } = {}) {
  return `
<a class="skip" href="#main">Skip to content</a>
<header class="top ${field}" data-top>
  <a class="wordmark" href="/"${path === '/' ? ' aria-current="page"' : ''}>${esc(ctx.c.identity.name)}</a>
  <nav aria-label="Main">${NAV.map(([href, text]) => `<a href="${href}"${path.startsWith(href) && href !== '/#contact' ? ' aria-current="page"' : ''}>${text}</a>`).join('')}</nav>
  <div class="tools">
    <button type="button" data-palette-open aria-haspopup="dialog"><span class="wide">Search</span><span class="narrow">Menu</span></button>
    <button type="button" data-theme-toggle aria-label="Switch between light and dark">Theme</button>
  </div>
</header>`;
}

export function foot(ctx) {
  const c = ctx.c;
  const m = ctx.meta;
  const stale = m.errors.length
    ? `<p class="stale">Some numbers here are from an earlier build: ${m.errors.map((e) => esc(e.source)).join(', ')} did not answer this time.</p>`
    : '';
  return `
<footer class="foot f-inverse" data-field="f-inverse">
  <div class="foot-cols">
    <nav aria-label="Pages">
      <p>Pages</p>
      <ul>
        <li>${link('/', 'Home')}</li>
        <li>${link('/research/', 'Research')}</li>
        <li>${link('/projects/', 'Projects')}</li>
        <li>${link('/writing/', 'Writing')}</li>
        <li>${link('/archive/', 'Past versions')}</li>
      </ul>
    </nav>
    <div class="h-card">
      <p>Elsewhere</p>
      <ul>
        ${c.identity.links.map((l) => `<li><a class="u-url" rel="me" href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('\n        ')}
        <li><a class="u-email" rel="me" href="mailto:${esc(c.identity.email)}">${esc(c.identity.email)}</a></li>
      </ul>
      <a class="u-url p-name sr-only" href="${ORIGIN}/">${esc(c.identity.name)}</a>
      <span class="p-locality sr-only">${esc(c.identity.location)}</span>
    </div>
    <div>
      <p>Feeds and data</p>
      <ul>
        <li>${link('/feed.xml', 'Writing feed')}</li>
        <li>${link('/releases.xml', 'Release feed')}</li>
        <li>${link('/build.json', 'build.json')}</li>
        <li>${link('/sitemap.xml', 'Sitemap')}</li>
        <li>${link('https://github.com/zaydmulani09/portfolio', 'Source')}</li>
      </ul>
    </div>
    <div class="foot-note">
      <p>This page</p>
      <p>A script fetched every number here from GitHub, Zenodo, Crossref, dev.to, crates.io, npm, Vercel, Hacker News and the Pages for Change site on ${when(m.generatedAt)}, and runs again every six hours. No cookies. Nothing loads from another site until you press Run on a simulation.</p>
      ${stale}
    </div>
  </div>
  <a class="foot-mark" href="/" aria-label="${esc(c.identity.name)}, home">
    <svg viewBox="0 0 1000 178" aria-hidden="true" preserveAspectRatio="xMinYMid meet"><text x="0" y="138" textLength="996" lengthAdjust="spacing">${esc(c.identity.name)}</text></svg>
  </a>
  <p class="legal">${esc(c.identity.name)}, ${esc(c.identity.location)}. Version ${ctx.c.version.current} of this site.</p>
</footer>
<dialog class="palette" data-palette aria-label="Search this site">
  <form method="dialog">
    <label class="sr-only" for="palette-q">Search pages, papers, projects and posts</label>
    <input id="palette-q" type="search" autocomplete="off" spellcheck="false" placeholder="Search pages, papers, projects, posts">
    <ul role="listbox" aria-label="Results"></ul>
    <p class="palette-hint">Enter opens. Esc closes.</p>
  </form>
</dialog>
<script src="${esc(ctx.assets.js)}" defer></script>`;
}

export function layout(ctx, opts, body) {
  return `${head(ctx, opts)}
<body${opts.bodyClass ? ` class="${opts.bodyClass}"` : ''}>${top(ctx, opts)}
<main id="main">
${body}
</main>
${foot(ctx)}${opts.scripts || ''}
</body>
</html>
`;
}

export function pageHead({ title, lead = '', small = '', long = false }) {
  return `<header class="page-head">
  <h1${long ? ' class="long"' : ''} data-rise>${title}</h1>
  ${lead ? `<p class="lead" data-rise>${lead}</p>` : ''}
  ${small ? `<p class="page-meta" data-rise>${small}</p>` : ''}
</header>`;
}

const KINDS = [
  ['commit', 'commit'],
  ['pr', 'pull request'],
  ['issue', 'issue'],
  ['review', 'review'],
  ['other', 'other contribution'],
];

const stamp = (day) => fmt(`${day}T00:00:00Z`, { month: 'short', day: 'numeric' });

export function pulseBars(p) {
  if (!p?.series?.length) return '';
  const peak = Math.max(...p.series.map((d) => d.count), 1);
  const bars = p.series
    .map((d) => {
      const h = d.count ? Math.max(6, Math.round((d.count / peak) * 100)) : 2;
      const bits = KINDS.filter(([k]) => d.parts[k] > 0).map(([k, one]) => plural(d.parts[k], one));
      const label = d.count ? `${bits.join(', ')} on ${stamp(d.day)}${d.partial ? ' so far' : ''}` : `nothing on ${stamp(d.day)}`;
      const segs = KINDS.filter(([k]) => d.parts[k] > 0)
        .map(([k]) => `<i class="seg-${k}" style="flex-grow:${d.parts[k]}"></i>`)
        .join('');
      return `<span class="bar" style="--h:${h}" title="${esc(label)}">${segs}</span>`;
    })
    .join('');
  const mix = KINDS.filter(([k]) => p.parts[k] > 0)
    .map(([k, one]) => plural(p.parts[k], one))
    .join(', ');
  const quiet = p.series.filter((d) => !d.count && !d.partial).length;
  const read = `${plural(p.total, 'contribution')} in the last ${p.days} days: ${mix}.${quiet ? ` ${plural(quiet, 'day')} with none.` : ''}`;
  const legend = KINDS.filter(([k]) => p.parts[k] > 0)
    .map(([k, one]) => `<span><i class="seg-${k}"></i>${k === 'other' ? 'Private and other' : `${one[0].toUpperCase()}${one.slice(1)}s`}</span>`)
    .join('');
  return `<div class="bars" role="img" aria-label="${esc(`${read} ${stamp(p.series[0].day)} to ${stamp(p.series.at(-1).day)}.`)}">${bars}</div>
  <p class="bars-axis"><span>${esc(stamp(p.series[0].day))}</span><span>${esc(stamp(p.series.at(-1).day))}, today</span></p>
  <p class="bars-legend">${legend}</p>
  <p class="bars-read">${esc(read)}</p>`;
}
