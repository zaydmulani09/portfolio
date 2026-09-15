#!/usr/bin/env node
// Fetches live state, renders the page, writes dist/.
//
//   node build/build.mjs
//
// Environment:
//   GITHUB_TOKEN   optional locally, supplied automatically in Actions.
//                  Without it the GitHub API allows 60 requests an hour.
//   VERCEL_TOKEN   optional. Without it the "live" table is skipped and the
//                  reason is printed on the page instead of a blank space.
//   VERCEL_TEAM_ID optional, only needed for team-scoped projects.

import { readFile, writeFile, mkdir, cp, stat, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as src from './sources.mjs';
import { page, feed, sitemap, archive, craftPage, craftEntries } from './render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

async function main() {
  const c = JSON.parse(await readFile(join(root, 'content.json'), 'utf8'));
  const user = c.identity.handle;
  const gh = process.env.GITHUB_TOKEN;

  console.log(`building ${user} at ${new Date().toISOString()}`);

  // --fixture renders from a committed snapshot instead of the network, for
  // layout work on a plane or with no tokens to hand. CI never uses it.
  const offline = process.argv.includes('--fixture');
  const fx = offline ? JSON.parse(await readFile(join(root, 'build/fixture.json'), 'utf8')) : null;

  const [repos, projects, posts, hn, pulse] = offline
    ? [fx.repos, fx.projects, fx.posts, fx.hn, fx.pulse]
    : await Promise.all([
        src.github(user, gh),
        src.vercel(process.env.VERCEL_TOKEN, process.env.VERCEL_TEAM_ID),
        src.devto(user),
        src.hackernews(user),
        src.activity(user, gh),
      ]);

  if (!repos) {
    // The repo list is the spine of the page. Without it there is nothing
    // honest to render, so fail loudly rather than publish a hollow page.
    console.error('github repo list failed, refusing to publish:', src.errors);
    process.exit(1);
  }

  // The newest commit anywhere, for the line under the bars. repos[] is
  // sorted by push date, so the first entry is the one to ask.
  if (pulse && !offline && repos.length) pulse.newest = await src.latestCommit(user, repos[0].name, gh);

  // Release and head-commit calls only for the repos on the page.
  const detail = offline ? fx.detail : {};
  if (!offline) {
    for (const f of c.projects) {
      if (repos.some((r) => r.name === f.repo)) {
        detail[f.repo] = await src.repoDetail(user, f.repo, gh);
      }
    }
  }

  const crates = offline ? fx.crates : {};
  if (!offline) {
    for (const f of c.projects) {
      if (f.crate) {
        const got = await src.crate(f.crate);
        if (got) crates[f.crate] = got;
        else if (!src.errors.some((e) => e.source === `crates:${f.crate}`))
          console.warn(`  crate ${f.crate} (for ${f.repo}) is not on crates.io; check content.json`);
      }
    }
  }

  // Repo descriptions print in the recent list and the craft log. Any of
  // those repos with no description gets its tagline pulled from its README.
  const listed = new Set(c.projects.map((p) => p.repo));
  const recent = repos.filter((r) => !listed.has(r.name)).slice(0, c.recentLimit);
  const needsLine = [...new Set([...recent, ...craftEntries(c, repos)])]
    .filter((r) => !r.description)
    .map((r) => r.name);
  const taglines = offline ? fx.taglines || {} : await src.readmeLines(user, needsLine, gh);
  for (const r of repos) if (!r.description && taglines[r.name]) r.description = taglines[r.name];

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(join(root, 'site'), dist, { recursive: true });

  const jsBytes = (await stat(join(dist, 'app.js'))).size;
  const fontFiles = ['bricolage-700', 'public-sans-400', 'public-sans-600', 'commit-mono-400'];
  const fontBytes = (
    await Promise.all(fontFiles.map(async (f) => (await stat(join(dist, 'fonts', `${f}.woff2`))).size))
  ).reduce((a, b) => a + b, 0);

  const named = ['github:repos', 'github:contributions', 'github:events', 'vercel:projects', 'devto:articles', 'hn:search'];
  const meta = {
    generatedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA?.slice(0, 7) || 'local',
    errors: offline ? [] : src.errors,
    fontFiles: fontFiles.length,
    fontBytes: kb(fontBytes),
    jsBytes: kb(jsBytes),
    version: c.version,
    sources: named.map((n) => ({
      name: n.split(':')[0],
      ok: offline || src.fetched.includes(n),
    })),
  };

  const data = { repos, projects, posts, hn, pulse, detail, crates, taglines };

  const html = page(c, data, meta);
  await writeFile(join(dist, 'index.html'), html);

  const hasCraft = repos.some((r) => (r.topics || []).includes(c.craft.topic));
  if (hasCraft) {
    await mkdir(join(dist, 'craft'), { recursive: true });
    await writeFile(join(dist, 'craft/index.html'), craftPage(c, data));
  }

  await mkdir(join(dist, 'archive'), { recursive: true });
  await writeFile(join(dist, 'archive/index.html'), archive(c, meta));

  const releases = Object.entries(detail)
    .filter(([, d]) => d?.release)
    .map(([repo, d]) => ({ repo, ...d.release }))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  await writeFile(join(dist, 'releases.xml'), feed(c, releases));
  await writeFile(join(dist, 'sitemap.xml'), sitemap(hasCraft));

  // The exact data the page was rendered from, so anyone can check the page
  // against its own inputs.
  await writeFile(join(dist, 'build.json'), JSON.stringify({ meta, data }, null, 2));

  console.log(
    `wrote dist/ | html ${kb(Buffer.byteLength(html))} | ${repos.length} repos | ` +
      `${projects?.length ?? 0} deployments | ${meta.errors.length} source errors`,
  );
  for (const e of meta.errors) console.warn(`  ${e.source}: ${e.error}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
