#!/usr/bin/env node
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import * as src from './sources.mjs';
import * as pages from './pages.mjs';
import { ORIGIN } from './ui.mjs';
import { cleanReadme, cleanPost, localize } from './clean.mjs';
import { ogImage } from './og.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const offline = process.argv.includes('--offline');
const readJson = async (p) => JSON.parse(await readFile(join(root, p), 'utf8'));

async function previous() {
  if (!offline) {
    try {
      const res = await fetch(`${ORIGIN}/build.json`, { signal: AbortSignal.timeout(15000) });
      const body = await res.json();
      if (body?.data?.papers) return body.data;
    } catch {}
  }
  try {
    return (await readJson('build/cache.json')).data;
  } catch {
    return {};
  }
}

async function gather(c, prev) {
  if (offline) return prev;
  const user = c.identity.handle;
  const gh = process.env.GITHUB_TOKEN;
  const keep = (fresh, key) => fresh ?? prev[key] ?? null;

  const [repos, profile, vercel, posts, hn, pulse, p4c, zen, ssrnDates] = await Promise.all([
    src.github(user, gh),
    src.profile(user, gh),
    src.vercel(process.env.VERCEL_TOKEN, process.env.VERCEL_TEAM_ID),
    src.devto(user),
    src.hackernews(user, c.identity.hn),
    src.activity(user, gh),
    src.pagesForChange(c.p4c.source),
    Promise.all(c.papers.map((p) => src.zenodo(p.zenodo))),
    Promise.all(c.papers.map((p) => src.crossrefDate(`10.2139/ssrn.${p.ssrn}`))),
  ]);

  const data = {
    repos: keep(repos, 'repos'),
    profile: keep(profile, 'profile'),
    vercel: keep(vercel, 'vercel'),
    posts: posts || (prev.posts || []).map((p) => ({ ...p, html: null })),
    hn: keep(hn, 'hn'),
    pulse: keep(pulse, 'pulse'),
    p4c: p4c ? { ...p4c, live: true } : { ...c.p4c.fallback, ...(prev.p4c || {}), live: false },
    papers: c.papers.map((p, i) => {
      const old = (prev.papers || []).find((x) => x.zenodo === p.zenodo) || {};
      return { ...old, ...p, ...(zen[i] || {}), ssrnAt: ssrnDates[i] || old.ssrnAt || null };
    }),
    detail: {},
    crates: {},
    npm: {},
  };
  if (!data.repos) return data;

  if (data.pulse && data.repos.length) {
    const head = await src.repoDetail(user, data.repos[0].name, gh);
    data.pulse.newest = head.head ? { ...head.head, repo: data.repos[0].name, at: head.head.date } : prev.pulse?.newest || null;
  }
  return data;
}

async function main() {
  const c = await readJson('content.json');
  const user = c.identity.handle;
  const gh = process.env.GITHUB_TOKEN;
  console.log(`building ${user} at ${new Date().toISOString()}${offline ? ' (offline, from build/cache.json)' : ''}`);

  const projects = new Map([...(await readJson('content/projects-a.json')), ...(await readJson('content/projects-b.json'))].map((p) => [p.repo, p]));
  const verdicts = await readJson('content/verdicts.json');
  const images = new Map((await readJson('site/img/manifest.json')).map((m) => [m.file, m]));

  const prev = await previous();
  const data = await gather(c, prev);
  if (!data.repos) {
    console.error('github repo list failed and there is no earlier build to fall back on:', src.errors);
    process.exit(1);
  }
  if (data.papers.some((p) => !p.title)) {
    console.error('paper metadata missing and there is no earlier build to fall back on:', src.errors);
    process.exit(1);
  }

  await rm(dist, { recursive: true, force: true });
  await mkdir(join(dist, '_img'), { recursive: true });
  await cp(join(root, 'site'), dist, { recursive: true });
  const save = async (img) => {
    await writeFile(join(dist, '_img', img.name), img.buf);
    return `/_img/${img.name}`;
  };

  const byRepo = new Map(data.repos.map((r) => [r.name, r]));
  const pageRepos = [...projects.keys()].filter((n) => byRepo.has(n));

  if (!offline) {
    const details = await src.pool(pageRepos, 6, (n) => src.repoDetail(user, n, gh));
    pageRepos.forEach((n, i) => (data.detail[n] = details[i]));
    for (const n of pageRepos) {
      const p = projects.get(n);
      if (p.links?.crate) data.crates[n] = (await src.crate(p.links.crate)) || prev.crates?.[n] || null;
      if (p.links?.npm) data.npm[n] = (await src.npm(p.links.npm)) || prev.npm?.[n] || null;
    }
    for (const n of pageRepos) {
      const d = data.detail[n];
      d.readme = d.readme ? await localize(cleanReadme(d.readme, user, n), save) : null;
    }
    for (const post of data.posts || []) {
      if (!post.raw) continue;
      post.repos = pageRepos.filter((n) => new RegExp(`github\\.com/${user}/${n}(?![\\w-])`, 'i').test(post.raw));
      post.html = await localize(cleanPost(post.raw), save);
      delete post.raw;
    }
  } else {
    const used = JSON.stringify(data).match(/\/_img\/[\w.]+/g) || [];
    for (const u of new Set(used)) await cp(join(root, 'build/cache-img', u.slice(6)), join(dist, u), { force: true }).catch(() => {});
  }

  const tag = async (f) => createHash('sha1').update(await readFile(join(dist, f))).digest('hex').slice(0, 8);
  const assets = {
    css: `/styles.css?v=${await tag('styles.css')}`,
    js: `/app.js?v=${await tag('app.js')}`,
    explorer: `/explorer.js?v=${await tag('explorer.js')}`,
  };

  const meta = {
    generatedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA?.slice(0, 7) || 'local',
    errors: offline ? [] : src.errors,
    version: c.version.current,
  };

  const demo = (name) => {
    const v = (data.vercel || []).find((p) => (p.repo || p.name).toLowerCase() === name.toLowerCase());
    const home = byRepo.get(name)?.homepage || '';
    const fromRepo = /^https?:/.test(home) && !/github\.com\/|crates\.io|npmjs\.com/.test(home) ? home : '';
    return v?.url || fromRepo || projects.get(name)?.links?.demo || '';
  };

  const projectPages = pageRepos.map((n) => ({ r: byRepo.get(n), p: projects.get(n), d: data.detail[n], crate: data.crates[n], npm: data.npm[n] }));
  const papers = [...data.papers].sort((a, b) => new Date(b.date) - new Date(a.date));

  const ctx = {
    c,
    data,
    meta,
    assets,
    images,
    projects,
    verdicts,
    papers,
    projectPages,
    repo: (n) => byRepo.get(n) || null,
    demo,
    simUrls: c.sims.map((s) => demo(s.repo)).filter(Boolean),
  };

  const out = [];
  const page = (path, html, og) => out.push({ path, html, og });
  const posts = data.posts || [];

  page('/', pages.home(ctx), { file: 'home', title: c.identity.name, sub: 'Research, Rust tools and GPU simulations', big: true });
  page('/research/', pages.researchIndex(ctx), { file: 'research', title: 'Research', sub: `${papers.length} preprints, one paper in progress`, big: true });
  for (const p of papers) page(`/research/${p.slug}/`, pages.paperPage(ctx, p), { file: `research-${p.slug}`, title: p.short, sub: p.sub, kind: 'Paper' });
  page(`/research/${c.ongoing.slug}/`, pages.ongoingPage(ctx), { file: `research-${c.ongoing.slug}`, title: c.ongoing.title, sub: c.ongoing.sub, kind: 'Paper in progress' });
  page('/projects/', pages.projectsIndex(ctx), { file: 'projects', title: 'Projects', sub: `${projectPages.length} projects with a write-up`, big: true });
  projectPages.forEach((e, i) => page(`/projects/${e.r.name}/`, pages.projectPage(ctx, e, projectPages[i - 1], projectPages[i + 1]), { file: `projects-${e.r.name}`, title: e.r.name, sub: e.p.one, kind: 'Project', big: true }));
  page('/writing/', pages.writingIndex(ctx), { file: 'writing', title: 'Writing', sub: `${posts.length} posts`, big: true });
  posts.forEach((p, i) => page(`/writing/${p.slug}/`, pages.postPage(ctx, p, posts[i - 1], posts[i + 1]), { file: `writing-${p.slug}`, title: p.title, sub: '', kind: 'Writing' }));
  page('/archive/', pages.archivePage(ctx), { file: 'archive', title: 'Past versions', sub: 'Every earlier version of this site, still served', big: true });

  await mkdir(join(dist, 'og'), { recursive: true });
  for (const { path, html, og } of out) {
    const dir = join(dist, path);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html);
    await writeFile(join(dist, 'og', `${og.file}.png`), await ogImage(og));
  }
  await writeFile(join(dist, '404.html'), pages.notFound(ctx));
  await writeFile(join(dist, 'feed.xml'), pages.writingFeed(ctx));
  await writeFile(join(dist, 'releases.xml'), pages.releaseFeed(ctx));
  await writeFile(join(dist, 'sitemap.xml'), pages.sitemap(out.map((o) => o.path), meta.generatedAt.slice(0, 10)));
  await writeFile(join(dist, 'search.json'), JSON.stringify(pages.searchIndex(ctx)));
  await writeFile(join(dist, 'build.json'), JSON.stringify({ meta, data }));

  if (process.argv.includes('--save-cache')) {
    await writeFile(join(root, 'build/cache.json'), JSON.stringify({ meta, data }));
    await rm(join(root, 'build/cache-img'), { recursive: true, force: true });
    await cp(join(dist, '_img'), join(root, 'build/cache-img'), { recursive: true });
  }

  console.log(`wrote ${out.length} pages | ${data.repos.length} repos | ${projectPages.length} project pages | ${posts.length} posts | ${meta.errors.length} source errors`);
  for (const e of meta.errors) console.warn(`  ${e.source}: ${e.error}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
