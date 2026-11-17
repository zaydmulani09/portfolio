import { createHash } from 'node:crypto';

const UA = 'zayd.dpdns.org build script (+https://github.com/zaydmulani09/portfolio)';

export const errors = [];
export const fetched = [];

async function request(url, { headers = {}, label, absentOk = false, quiet = false, method = 'GET', payload, as = 'json', accept = 'application/json' } = {}) {
  const name = label || new URL(url).host;
  try {
    const res = await fetch(url, {
      method,
      body: payload,
      headers: { 'user-agent': UA, accept, ...headers },
      signal: AbortSignal.timeout(25000),
    });
    if (res.status === 404 && absentOk) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = as === 'json' ? await res.json() : as === 'text' ? await res.text() : Buffer.from(await res.arrayBuffer());
    fetched.push(name);
    return body;
  } catch (err) {
    if (!quiet) errors.push({ source: name, url, error: String(err.message || err) });
    return null;
  }
}

const json = (url, opts) => request(url, opts);

export async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

export const undash = (s) =>
  String(s ?? '')
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1-$2')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

export const undashHtml = (html) =>
  String(html ?? '')
    .split(/(<pre[\s\S]*?<\/pre>)/)
    .map((part, i) =>
      i % 2
        ? part.replace(/[—–]|&mdash;|&ndash;|&#8212;|&#8211;/g, '-')
        : part
            .replace(/(\d)\s*(?:[—–]|&mdash;|&ndash;|&#8212;|&#8211;)\s*(\d)/g, '$1-$2')
            .replace(/\s*(?:[—–]|&mdash;|&ndash;|&#8212;|&#8211;)\s*/g, ', '),
    )
    .join('');

const bearer = (token) => (token ? { authorization: `Bearer ${token}` } : {});

export async function github(user, token) {
  const pages = await Promise.all(
    [1, 2].map((n) =>
      json(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed&type=owner&page=${n}`, {
        headers: bearer(token),
        label: 'github:repos',
        quiet: n > 1,
      }),
    ),
  );
  if (!Array.isArray(pages[0])) return null;
  return pages
    .filter(Array.isArray)
    .flat()
    .filter((r) => !r.fork && !r.archived && !r.private)
    .map((r) => ({
      name: r.name,
      description: undash(r.description),
      language: r.language || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushedAt: r.pushed_at,
      createdAt: r.created_at,
      url: r.html_url,
      homepage: r.homepage || '',
      topics: r.topics || [],
      license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null,
    }));
}

export async function profile(user, token) {
  const u = await json(`https://api.github.com/users/${user}`, { headers: bearer(token), label: 'github:user' });
  return u ? { followers: u.followers, publicRepos: u.public_repos, createdAt: u.created_at } : null;
}

export async function repoDetail(user, repo, token) {
  const headers = bearer(token);
  const [release, commits, readme] = await Promise.all([
    json(`https://api.github.com/repos/${user}/${repo}/releases/latest`, { headers, label: `github:release:${repo}`, absentOk: true }),
    json(`https://api.github.com/repos/${user}/${repo}/commits?per_page=1`, { headers, label: `github:commit:${repo}` }),
    request(`https://api.github.com/repos/${user}/${repo}/readme`, {
      headers,
      label: `github:readme:${repo}`,
      absentOk: true,
      as: 'text',
      accept: 'application/vnd.github.html',
    }),
  ]);
  const head = Array.isArray(commits) ? commits[0] : null;
  return {
    release: release ? { tag: release.tag_name, publishedAt: release.published_at, url: release.html_url } : null,
    head: head
      ? {
          sha: head.sha.slice(0, 7),
          message: undash((head.commit?.message || '').split('\n')[0]),
          date: head.commit?.committer?.date || null,
          url: head.html_url,
        }
      : null,
    readme: readme || null,
  };
}

function pickAlias(aliases = []) {
  const usable = aliases.filter((a) => a && !a.includes('-git-') && !/-[a-z0-9]{9}-/.test(a));
  const custom = usable.find((a) => !a.endsWith('.vercel.app'));
  if (custom) return custom;
  return usable.sort((a, b) => a.length - b.length)[0] || null;
}

export async function vercel(token, teamId) {
  if (!token) {
    errors.push({ source: 'vercel', error: 'VERCEL_TOKEN not set' });
    return null;
  }
  const qs = teamId ? `?limit=100&teamId=${encodeURIComponent(teamId)}` : '?limit=100';
  const body = await json(`https://api.vercel.com/v9/projects${qs}`, { headers: bearer(token), label: 'vercel:projects' });
  if (!body?.projects) return null;
  return body.projects
    .map((p) => {
      const prod = p.targets?.production;
      const alias = pickAlias(prod?.alias);
      return {
        name: p.name,
        repo: p.link?.type === 'github' ? p.link.repo : null,
        url: alias ? `https://${alias}` : null,
        state: prod?.readyState || null,
        deployedAt: prod?.createdAt ? new Date(prod.createdAt).toISOString() : null,
      };
    })
    .filter((p) => p.url);
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/['’".]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 9)
    .join('-');

export async function devto(user) {
  const posts = await json(`https://dev.to/api/articles?username=${user}&per_page=100`, { label: 'devto:articles' });
  if (!Array.isArray(posts)) return null;
  const out = [];
  for (const p of posts) {
    let full = await json(`https://dev.to/api/articles/${p.id}`, { label: `devto:article:${p.id}`, quiet: true });
    if (!full) {
      await new Promise((r) => setTimeout(r, 2000));
      full = await json(`https://dev.to/api/articles/${p.id}`, { label: `devto:article:${p.id}` });
    }
    out.push({
      id: p.id,
      slug: slugify(p.title),
      title: undash(p.title),
      description: undash(p.description),
      url: p.url,
      publishedAt: p.published_at,
      reactions: p.public_reactions_count,
      comments: p.comments_count,
      minutes: p.reading_time_minutes,
      tags: p.tag_list || [],
      raw: full?.body_html || null,
      html: null,
      repos: [],
    });
    await new Promise((r) => setTimeout(r, 350));
  }
  return out;
}

export async function crate(name) {
  const body = await json(`https://crates.io/api/v1/crates/${name}`, { label: `crates:${name}`, absentOk: true });
  if (!body?.crate) return null;
  return {
    name: body.crate.name,
    downloads: body.crate.downloads,
    version: body.crate.max_stable_version || body.crate.max_version,
    url: `https://crates.io/crates/${body.crate.name}`,
  };
}

export async function npm(name) {
  const [meta, dl] = await Promise.all([
    json(`https://registry.npmjs.org/${name}/latest`, { label: `npm:${name}`, absentOk: true }),
    json(`https://api.npmjs.org/downloads/point/last-month/${name}`, { label: `npm:downloads:${name}`, absentOk: true, quiet: true }),
  ]);
  if (!meta?.version) return null;
  return { name, version: meta.version, monthly: dl?.downloads ?? null, url: `https://www.npmjs.com/package/${name}` };
}

async function contributions(user, token, from, to) {
  if (!token) return null;
  const query = `query($user: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $user) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
        commitContributionsByRepository(maxRepositories: 100) {
          contributions(first: 100) { nodes { occurredAt commitCount } }
        }
        issueContributions(first: 100) { nodes { occurredAt } }
        pullRequestContributions(first: 100) { nodes { occurredAt } }
        pullRequestReviewContributions(first: 100) { nodes { occurredAt } }
      }
    }
  }`;
  const body = await json('https://api.github.com/graphql', {
    method: 'POST',
    payload: JSON.stringify({ query, variables: { user, from: new Date(from).toISOString(), to: new Date(to).toISOString() } }),
    headers: { ...bearer(token), 'content-type': 'application/json' },
    label: 'github:contributions',
    quiet: true,
  });
  const cc = body?.data?.user?.contributionsCollection;
  const repos = cc?.commitContributionsByRepository;
  if (!Array.isArray(repos) || !cc?.contributionCalendar) return null;

  const byDay = new Map();
  const bump = (day, kind, n = 1) => {
    const e = byDay.get(day) || { commit: 0, pr: 0, issue: 0, review: 0 };
    e[kind] += n;
    byDay.set(day, e);
  };
  for (const r of repos) for (const c of r.contributions?.nodes || []) bump(c.occurredAt.slice(0, 10), 'commit', c.commitCount);
  for (const n of cc.issueContributions?.nodes || []) bump(n.occurredAt.slice(0, 10), 'issue');
  for (const n of cc.pullRequestContributions?.nodes || []) bump(n.occurredAt.slice(0, 10), 'pr');
  for (const n of cc.pullRequestReviewContributions?.nodes || []) bump(n.occurredAt.slice(0, 10), 'review');

  const calByDay = new Map();
  for (const w of cc.contributionCalendar.weeks || []) for (const d of w.contributionDays || []) calByDay.set(d.date, d.contributionCount);
  return { byDay, calByDay };
}

export async function activity(user, token, days = 30) {
  const now = new Date();
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const cutoff = todayStart - (days - 1) * 86400000;
  const graph = await contributions(user, token, cutoff, +now);
  if (!graph) {
    errors.push({ source: 'github:contributions', error: token ? 'no response' : 'needs a token' });
    return null;
  }
  const kinds = ['commit', 'pr', 'issue', 'review', 'other'];
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(todayStart - i * 86400000).toISOString().slice(0, 10);
    const p = graph.byDay.get(day) || { commit: 0, pr: 0, issue: 0, review: 0 };
    const typed = p.commit + p.pr + p.issue + p.review;
    const count = Math.max(graph.calByDay.get(day) ?? typed, typed);
    series.push({ day, count, parts: { ...p, other: Math.max(0, count - typed) }, ...(i === 0 ? { partial: true } : {}) });
  }
  const parts = Object.fromEntries(kinds.map((k) => [k, series.reduce((a, b) => a + b.parts[k], 0)]));
  return { series, parts, total: series.reduce((a, b) => a + b.count, 0), days: series.length };
}

export async function hackernews(user, hnUser) {
  const [byUrl, byAuthor] = await Promise.all([
    json(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(user)}&tags=story&hitsPerPage=50`, { label: 'hn:search' }),
    json(`https://hn.algolia.com/api/v1/search?tags=story,author_${encodeURIComponent(hnUser)}&hitsPerPage=50`, { label: 'hn:author', quiet: true }),
  ]);
  if (!byUrl?.hits) return null;
  const seen = new Map();
  for (const h of [...byUrl.hits, ...(byAuthor?.hits || [])]) {
    if (!((h.url || '').includes(`/${user}/`) || h.author === hnUser)) continue;
    seen.set(h.objectID, h);
  }
  return [...seen.values()]
    .filter((h) => (h.points || 0) >= 2)
    .map((h) => ({
      title: undash(h.title),
      points: h.points,
      comments: h.num_comments,
      createdAt: h.created_at,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      target: h.url || null,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);
}

const stripTags = (s) =>
  String(s || '')
    .replace(/<\/p>\s*<p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .trim();

export async function zenodo(id) {
  const d = await json(`https://zenodo.org/api/records/${id}`, { label: `zenodo:${id}` });
  const m = d?.metadata;
  if (!m?.title) return null;
  const file = (d.files || []).find((f) => f.key.endsWith('.pdf'));
  return {
    id: String(d.id),
    doi: d.doi,
    title: undash(m.title),
    date: m.publication_date,
    abstract: stripTags(m.description)
      .split(/\n\n+/)
      .map(undash)
      .filter((p) => p && !/^Code, raw per-item outputs/.test(p)),
    keywords: m.keywords || [],
    license: m.license?.id || null,
    pdf: file ? `https://zenodo.org/records/${d.id}/files/${file.key}?download=1` : null,
    views: d.stats?.unique_views ?? null,
    downloads: d.stats?.unique_downloads ?? null,
    url: `https://zenodo.org/records/${d.id}`,
  };
}

export async function crossrefDate(doi) {
  const d = await json(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { label: `crossref:${doi}`, quiet: true });
  return d?.message?.created?.['date-time'] || null;
}

export async function pagesForChange(url) {
  const text = await request(url, { label: 'p4c:llms', as: 'text', accept: 'text/plain' });
  if (!text) return null;
  const n = String.raw`(\d{1,3}(?:,\d{3})*)`;
  const books = text.match(new RegExp(`More than ${n} books`, 'i'))?.[1];
  const pages = text.match(new RegExp(`about ${n} pages`, 'i'))?.[1];
  const drive = text.match(new RegExp(`count reached ${n}`, 'i'))?.[1];
  if (!books) {
    errors.push({ source: 'p4c:llms', error: 'book count not found' });
    return null;
  }
  return { books, pages: pages || null, drive: drive || null };
}

function imageSize(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return [b.readUInt16LE(6), b.readUInt16LE(8)];
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === 'VP8L') {
      const n = b.readUInt32LE(21);
      return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1];
    }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif' };

export async function fetchImage(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'image/webp,image/png,image/jpeg,image/gif,image/svg+xml' }, signal: AbortSignal.timeout(25000) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    const ext = EXT[type];
    if (!ext) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 3_000_000) return null;
    const size = ext === 'svg' ? null : imageSize(buf);
    return { buf, name: `${createHash('sha1').update(buf).digest('hex').slice(0, 12)}.${ext}`, width: size?.[0] || null, height: size?.[1] || null };
  } catch {
    return null;
  }
}
