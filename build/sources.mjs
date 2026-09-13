// Every network call lives here. Each one is allowed to fail: a failed source
// is recorded in build.json and its section is left out of the page, but the
// build still succeeds and deploys. A portfolio that 500s because GitHub is
// slow is worse than one missing a table.

const UA = 'zayd.dpdns.org build script (+https://github.com/zaydmulani09/portfolio)';

export const errors = [];
export const fetched = [];

// `absentOk`: a 404 from this URL is an answer, not a failure. A repo with no
// releases 404s on /releases/latest, and a crate that was never published 404s
// on crates.io. Neither makes the page stale, so neither is recorded as an
// error; the caller just gets null.
// `quiet`: a first attempt the caller will retry another way. A failure is
// returned as null and not recorded, so only the retry can mark the page stale.
async function json(url, { headers = {}, label, absentOk = false, quiet = false } = {}) {
  const name = label || new URL(url).host;
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json', ...headers },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 404 && absentOk) return null;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = await res.json();
    fetched.push(name);
    return body;
  } catch (err) {
    if (!quiet) errors.push({ source: name, url, error: String(err.message || err) });
    return null;
  }
}

// House rule: no em dashes in copy on the site, including copy that arrives
// from an API. GitHub descriptions, commit messages and post titles all go
// through here; the README extractor below uses the same rule.
export const undash = (s) =>
  String(s ?? '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

/* ---------------------------------------------------------------- github */

export async function github(user, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const repos = await json(
    `https://api.github.com/users/${user}/repos?per_page=100&sort=pushed&type=owner`,
    { headers, label: 'github:repos' },
  );
  if (!Array.isArray(repos)) return null;

  return repos
    .filter((r) => !r.fork && !r.archived && !r.private)
    .map((r) => ({
      name: r.name,
      description: undash(r.description),
      language: r.language || '',
      stars: r.stargazers_count,
      forks: r.forks_count,
      openIssues: r.open_issues_count,
      pushedAt: r.pushed_at,
      createdAt: r.created_at,
      url: r.html_url,
      homepage: r.homepage || '',
      topics: r.topics || [],
      license: r.license?.spdx_id || null,
    }));
}

// Only called for the handful of featured repos, to keep the request count low.
export async function repoDetail(user, repo, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const [release, commits] = await Promise.all([
    // 404 here means the repo has never cut a release, which the page says in
    // words. It is not a failed source.
    json(`https://api.github.com/repos/${user}/${repo}/releases/latest`, {
      headers,
      label: `github:release:${repo}`,
      absentOk: true,
    }),
    json(`https://api.github.com/repos/${user}/${repo}/commits?per_page=1`, {
      headers,
      label: `github:commit:${repo}`,
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
  };
}

/* ---------------------------------------------------------------- vercel */

// A project can carry several production aliases. Prefer a custom domain,
// then the short `<project>.vercel.app`, and never a per-deployment hash URL.
function pickAlias(aliases = []) {
  const usable = aliases.filter((a) => a && !a.includes('-git-') && !/-[a-z0-9]{9}-/.test(a));
  const custom = usable.find((a) => !a.endsWith('.vercel.app'));
  if (custom) return custom;
  return usable.sort((a, b) => a.length - b.length)[0] || null;
}

export async function vercel(token, teamId) {
  if (!token) {
    errors.push({ source: 'vercel', error: 'VERCEL_TOKEN not set; live section skipped' });
    return null;
  }
  const qs = teamId ? `?limit=100&teamId=${encodeURIComponent(teamId)}` : '?limit=100';
  const body = await json(`https://api.vercel.com/v9/projects${qs}`, {
    headers: { authorization: `Bearer ${token}` },
    label: 'vercel:projects',
  });
  if (!body?.projects) return null;

  return body.projects
    .map((p) => {
      const prod = p.targets?.production;
      const alias = pickAlias(prod?.alias);
      return {
        name: p.name,
        repo: p.link?.type === 'github' ? p.link.repo : null,
        repoUrl: p.link?.type === 'github' ? `https://github.com/${p.link.org}/${p.link.repo}` : null,
        framework: p.framework || null,
        url: alias ? `https://${alias}` : null,
        state: prod?.readyState || null,
        deployedAt: prod?.createdAt ? new Date(prod.createdAt).toISOString() : null,
        commit: prod?.meta?.githubCommitMessage?.split('\n')[0] || null,
      };
    })
    .filter((p) => p.url);
}

/* ---------------------------------------------------------------- dev.to */

export async function devto(user) {
  const posts = await json(`https://dev.to/api/articles?username=${user}&per_page=10`, {
    label: 'devto:articles',
  });
  if (!Array.isArray(posts)) return null;
  return posts.map((p) => ({
    title: undash(p.title),
    url: p.url,
    publishedAt: p.published_at,
    reactions: p.public_reactions_count,
    comments: p.comments_count,
    readingMinutes: p.reading_time_minutes,
  }));
}

/* ------------------------------------------------------------- crates.io */

export async function crate(name) {
  // A crate that is not on crates.io is a content.json problem, not an outage.
  // The row just loses its download count; the build prints a warning.
  const body = await json(`https://crates.io/api/v1/crates/${name}`, { label: `crates:${name}`, absentOk: true });
  if (!body?.crate) return null;
  return {
    name: body.crate.name,
    downloads: body.crate.downloads,
    recentDownloads: body.crate.recent_downloads,
    version: body.crate.max_stable_version || body.crate.max_version,
    url: `https://crates.io/crates/${body.crate.name}`,
  };
}

/* ---------------------------------------------------- readme fallback --- */

// A lot of repos have a good one-line pitch at the top of the README and an
// empty GitHub description field. Rather than keep those lines in two places,
// pull the tagline out of the README and use it when the description is blank.
function tagline(md) {
  const lines = md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) => l.trim());

  const structural = (l) =>
    /^(#{1,6}\s|>|\||-{3,}|={3,}|```)/.test(l) || // headings, rules, tables, fences
    /^!?\[/.test(l) || // badges and images
    /^[*_-]\s/.test(l); // list items

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || structural(line)) continue;

    // A hard-wrapped README puts one sentence across several physical lines.
    // Take the whole paragraph, up to the next blank line, not just the first.
    let para = line;
    for (let j = i + 1; j < lines.length && lines[j] && !structural(lines[j]); j++) para += ` ${lines[j]}`;

    const text = para
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links to their text
      .replace(/[*_`]/g, '')
      // House rule: no em dashes in copy on the site, including copy lifted
      // out of a README.
      .replace(/\s*[\u2014\u2013]\s*/g, ', ')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length < 25) continue;
    if (text.length <= 200) return text;

    // Cut at the last sentence end that fits, rather than mid-word.
    const cut = text.slice(0, 200);
    const stop = cut.lastIndexOf('. ');
    return stop > 60 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}...`;
  }
  return '';
}

export async function readmeLines(user, repos, token) {
  const out = {};
  for (const repo of repos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${user}/${repo}/readme`, {
        headers: {
          'user-agent': UA,
          accept: 'application/vnd.github.raw',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const line = tagline(await res.text());
      if (line) out[repo] = line;
    } catch {
      // A missing README is not an error. The row renders without a note.
    }
  }
  return out;
}

/* ------------------------------------------------------ recent activity */

// A month of public activity, used for the pulse strip and for the newest
// commit message, quoted exactly as written. Unpolished commit messages are
// the point.
//
// The events API counts pushes, not commits: a PushEvent payload is now just
// `{ repository_id, push_id, ref, head, before }`, with no commit list, so the
// strip is one push, one tick. The message comes from one more call for the
// head of the newest push. Events page at 100 and stop at 300 or 90 days, so
// a busy month needs up to three pages to cover 30 days.
export async function activity(user, token, days = 30) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const cutoff = Date.now() - days * 86400000;

  // The feed is public, so the token only buys rate limit, and the token
  // Actions hands out actually sees less: one short page ending weeks early,
  // where an unauthenticated call returns all three. So ask without the token
  // first, and only fall back to it if the shared runner IP is rate-limited.
  let auth = false;
  const eventsPage = async (page) => {
    const url = `https://api.github.com/users/${user}/events/public?per_page=100&page=${page}`;
    if (!auth) {
      const open = await json(url, { label: 'github:events', quiet: Boolean(token) });
      if (Array.isArray(open) || !token) return open;
      auth = true;
    }
    return json(url, { headers, label: 'github:events' });
  };

  const events = [];
  let exhausted = false; // the API ran out of events before the window did
  const pages = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await eventsPage(page);
    if (!Array.isArray(batch)) {
      if (page === 1) return null;
      break;
    }
    pages.push(batch.length);
    events.push(...batch);
    // A short page means the feed ended. An empty page after a full one does
    // not: the feed sometimes serves that, and the days it would have covered
    // are unknown rather than quiet.
    if (batch.length === 0) break;
    if (batch.length < 100) exhausted = true;
    if (exhausted || +new Date(batch[batch.length - 1].created_at) < cutoff) break;
  }
  console.log(
    `  events: ${events.length} over ${pages.length} page(s) [${pages.join(', ')}], oldest ${
      events.length ? events[events.length - 1].created_at.slice(0, 10) : 'none'
    }, ${exhausted ? 'feed exhausted' : 'feed not exhausted'}, ${auth ? 'with token' : 'without token'}`,
  );

  // If the cap cut the feed off inside the window, the days before the oldest
  // event are unknown, not quiet. Shorten the window to what was actually
  // seen rather than draw empty days that may not have been.
  let start = cutoff;
  const oldest = events.length ? +new Date(events[events.length - 1].created_at) : null;
  if (!exhausted && oldest !== null && oldest > cutoff) start = oldest;

  const byDay = new Map();
  let head = null;

  for (const e of events) {
    if (e.type !== 'PushEvent') continue;
    const at = new Date(e.created_at);
    if (+at < cutoff) continue;

    const day = at.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);

    // Events arrive newest first, so the first push seen is the newest.
    if (!head && e.payload?.head && e.repo?.name) head = { sha: e.payload.head, repo: e.repo.name, at };
  }

  let newest = null;
  if (head) {
    // 404 here means the commit was force-pushed away since. Then there is no
    // message to quote, and the line is left out rather than the page marked
    // stale.
    const commit = await json(`https://api.github.com/repos/${head.repo}/commits/${head.sha}`, {
      headers,
      label: 'github:commit:newest',
      absentOk: true,
    });
    if (commit?.commit?.message) {
      newest = {
        message: undash(commit.commit.message.split('\n')[0]),
        repo: head.repo.split('/')[1] || '',
        at: head.at.toISOString(),
      };
    }
  }

  // Fill the gaps so quiet days read as quiet rather than disappearing.
  const series = [];
  const today = new Date().toISOString().slice(0, 10);
  const first = new Date(start).toISOString().slice(0, 10);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (day < first || day > today) continue;
    series.push({ day, pushes: byDay.get(day) || 0 });
  }

  return { series, newest, total: series.reduce((a, b) => a + b.pushes, 0), days: series.length };
}

/* ------------------------------------------------- hacker news (algolia) */

// Third-party evidence: threads other people voted on and argued in. Matched
// by URL so a stranger with a similar name cannot end up on the page.
export async function hackernews(user) {
  const body = await json(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(user)}&tags=story&hitsPerPage=50`,
    { label: 'hn:search' },
  );
  if (!body?.hits) return null;
  return body.hits
    .filter((h) => (h.url || '').includes(`/${user}/`) || h.author === user)
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
