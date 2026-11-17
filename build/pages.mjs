import { ORIGIN, esc, num, plural, when, dateText, monthText, link, picture, layout, pageHead, pulseBars } from './ui.mjs';

const person = (c) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: c.identity.name,
  url: `${ORIGIN}/`,
  email: `mailto:${c.identity.email}`,
  identifier: `https://orcid.org/${c.identity.orcid}`,
  address: { '@type': 'PostalAddress', addressRegion: 'NJ', addressCountry: 'US' },
  jobTitle: 'Founder, Pages for Change',
  sameAs: c.identity.links.map((l) => l.href),
});

const doiUrl = (doi) => `https://doi.org/${doi}`;
const ssrnUrl = (id) => `https://papers.ssrn.com/sol3/papers.cfm?abstract_id=${id}`;
const langClass = (l) => (l === 'Rust' ? 'l1' : /Script/.test(l) ? 'l2' : l === 'Python' ? 'l3' : 'l4');
const repoFacts = (r) => [r.language, r.stars ? plural(r.stars, 'star') : ''].filter(Boolean).join(', ');

function paperLinks(p) {
  return [
    p.pdf ? link(p.pdf, 'PDF') : '',
    link(doiUrl(p.doi), 'Zenodo'),
    p.ssrn ? link(ssrnUrl(p.ssrn), 'SSRN') : '',
    p.repo ? link(`https://github.com/zaydmulani09/${p.repo}`, 'Code and data') : '',
  ]
    .filter(Boolean)
    .join('');
}

function outcome(o) {
  return `<span class="verdict v-${esc(o.replace(/\s/g, '-'))}">${esc(o)}</span>`;
}

function stage(ctx, sim, r, eager = false) {
  const url = ctx.demo(sim.repo);
  const img = picture(ctx, `sims/${sim.repo}-1600.webp`, { sizes: '(min-width: 900px) 62vw, 100vw', eager });
  const run = sim.embed && url ? `<button type="button" class="button" data-run="${esc(url)}" data-title="${esc(sim.repo)}">Run it here</button>` : '';
  const open = url ? `<a class="button${run ? ' quiet' : ''}" href="${esc(url)}">Open in a tab</a>` : '';
  return `<div class="stage" data-stage>${img}<div class="stage-actions">${run}${open}</div></div>`;
}

export function home(ctx) {
  const { c, data } = ctx;
  const papers = ctx.papers;
  const mnemo = ctx.repo('mnemo');
  const hnTop = (data.hn || [])[0];
  const first = data.repos.reduce((a, r) => (r.createdAt < a ? r.createdAt : a), data.repos[0].createdAt);
  const p4c = data.p4c;

  const hero = `
<section class="hero f-moss" data-field="f-moss">
  <h1 class="hero-name lines" aria-label="${esc(c.identity.name)}"><span class="line"><span data-line style="--i:0">Zayd</span></span><span class="line ink-2"><span data-line style="--i:1">Mulani</span></span></h1>
  <div class="hero-foot">
    <p data-rise style="--i:3">High-school senior in New Jersey. ${esc(c.seeking)}</p>
    <a class="button" data-rise style="--i:4" href="mailto:${esc(c.identity.email)}">${esc(c.hero.action)}</a>
  </div>
</section>`;

  const intro = `
<section class="intro" data-field="">
  <p class="lead-wide" data-reveal>${esc(c.intro.lead)}</p>
  <div class="cols4">
    <p data-reveal style="--i:0"><strong>Right now.</strong> ${esc(c.seeking)} If you run a lab or a team that works on systems, databases or how language models are evaluated, I would like to hear from you at ${link(`mailto:${c.identity.email}`, c.identity.email)}.</p>
    <p data-reveal style="--i:1"><strong>Research.</strong> ${plural(papers.length, 'solo preprint')} on Zenodo and SSRN, and one paper in progress. I write the predictions down first and report the ones that fail. ${link('/research/', 'Read the research')}.</p>
    <p data-reveal style="--i:2"><strong>Software.</strong> ${plural(data.repos.length, 'public repository', 'public repositories')} since ${esc(monthText(first))}, mostly Rust.${mnemo ? ` mnemo, a memory layer for language-model pipelines, has ${plural(mnemo.stars, 'star')}${hnTop ? ` and reached ${plural(hnTop.points, 'point')} on Hacker News` : ''}.` : ''} ${link('/projects/', 'See the projects')}.</p>
    <p data-reveal style="--i:3"><strong>Books.</strong> I founded Pages for Change, a student nonprofit that collects children's books and gets them to kids who need them. More than ${esc(p4c.books)} so far. ${link('#books', 'More on that')}.</p>
  </div>
</section>`;

  const sp = c.research.specimen;
  const rows = [
    ...papers.map(
      (p) => `<tr>
        <td>${when(p.date, monthText)}</td>
        <th scope="row"><a href="/research/${esc(p.slug)}/">${esc(p.short)}</a><span>${esc(p.sub)}</span></th>
        <td>${esc(p.kind)}</td>
        <td class="t-links">${paperLinks(p)}</td>
      </tr>`,
    ),
    `<tr>
        <td>In progress</td>
        <th scope="row"><a href="/research/${esc(c.ongoing.slug)}/">${esc(c.ongoing.title)}</a><span>${esc(c.ongoing.sub)}</span></th>
        <td>Theorem and simulation</td>
        <td class="t-links">${link(`/research/${c.ongoing.slug}/`, 'Read the summary')}</td>
      </tr>`,
  ].join('\n');

  const research = `
<section class="research f-inverse" data-field="f-inverse" id="research">
  <div class="sec-head">
    <h2 data-reveal>Research</h2>
    <p data-reveal style="--i:1">${esc(c.research.lead)}</p>
  </div>
  <div class="specimens" aria-hidden="true">
    <div data-reveal><p>${esc(sp.a.caption)}</p><span>${esc(sp.a.word)}</span></div>
    <div data-reveal style="--i:2"><p>${esc(sp.b.caption)}</p><span>${esc(sp.b.word)}</span></div>
  </div>
  <p class="specimen-note" data-reveal>${esc(sp.text)} ${link(`/research/${sp.paper}/`, 'Read the paper')}.</p>
  <h3 class="sr-only">Papers</h3>
  <div class="scroll"><table class="record" data-reveal>
    <thead><tr><th scope="col">Date</th><th scope="col">Paper</th><th scope="col">Kind</th><th scope="col">Read it</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <p class="more" data-reveal>${link('/research/', 'All research, with predictions and outcomes')}</p>
</section>`;

  const poster = `
<section class="poster-sec" data-field="" id="projects">
  <h2 class="sr-only">Projects</h2>
  <ol class="poster">
    ${c.featured
      .map((name, i) => {
        const r = ctx.repo(name);
        const p = ctx.projects.get(name);
        if (!r) return '';
        return `<li data-reveal style="--i:${i % 4}"><a href="/projects/${esc(name)}/"><span class="poster-name">${esc(name)}</span><span class="poster-detail"><span>${esc(p?.one || r.description)}</span><span>${esc(repoFacts(r))}</span></span></a></li>`;
      })
      .join('\n    ')}
  </ol>
  <p class="more" data-reveal>${link('/projects/', `All ${ctx.projectPages.length} projects with a write-up`)}</p>
</section>`;

  const sims = `
<section class="sims f-black" data-field="f-black" id="simulations">
  <div class="sec-head">
    <h2 data-reveal>Simulations</h2>
    <p data-reveal style="--i:1">Four of my projects are physics or search running on your GPU, in the tab. Each picture below is the real thing, paused. Press Run and it loads in place. Until you do, nothing is requested from another site.</p>
  </div>
  ${c.sims
    .map((sim, i) => {
      const r = ctx.repo(sim.repo);
      const p = ctx.projects.get(sim.repo);
      if (!r) return '';
      return `<article class="exhibit${i % 2 ? ' flip' : ''}">
    <div data-reveal>${stage(ctx, sim, r)}</div>
    <div class="exhibit-text" data-reveal style="--i:1">
      <h3><a href="/projects/${esc(sim.repo)}/">${esc(sim.repo)}</a></h3>
      <p>${esc(p?.body?.[0] || p?.one || r.description)}</p>
      <p class="small">${esc(repoFacts(r))}${r.pushedAt ? `. Last pushed ${when(r.pushedAt)}` : ''}.${sim.embedNote ? ` ${esc(sim.embedNote)}` : ''}</p>
    </div>
  </article>`;
    })
    .join('\n  ')}
</section>`;

  const pulse = data.pulse;
  const listed = new Set([...c.featured, ...c.sims.map((s) => s.repo)]);
  const recent = data.repos.filter((r) => !listed.has(r.name) && !c.shelfSkip.includes(r.name) && r.description).slice(0, 5);
  const now = `
<section class="now f-surface" data-field="f-surface" id="now">
  <div class="now-grid">
    <div>
      <h2 data-reveal>Last 30 days</h2>
      ${pulse ? `<p class="figure" data-reveal>${num(pulse.total)}</p><p data-reveal>contributions on GitHub, counted the way the profile graph counts them.</p>` : '<p>GitHub did not answer for the contribution graph on this build.</p>'}
    </div>
    <div data-reveal>
      ${pulseBars(pulse)}
      ${pulse?.newest ? `<p class="commit">Latest commit, in ${link(`https://github.com/${c.identity.handle}/${pulse.newest.repo}`, pulse.newest.repo)} on ${when(pulse.newest.at)}: <q>${esc(pulse.newest.message)}</q></p>` : ''}
    </div>
  </div>
  <h3 data-reveal>Recently pushed</h3>
  <ul class="rows">
    ${recent
      .map(
        (r) =>
          `<li data-reveal><a href="${ctx.projects.has(r.name) ? `/projects/${esc(r.name)}/` : esc(r.url)}">${esc(r.name)}</a><span>${esc(r.description)}</span>${when(r.pushedAt)}</li>`,
      )
      .join('\n    ')}
  </ul>
</section>`;

  const shelfRepos = data.repos.filter((r) => !c.shelfSkip.includes(r.name) && (r.description || ctx.projects.has(r.name)));
  const shelf = `
<section class="shelf-sec" data-field="" id="shelf">
  <div class="sec-head">
    <h2 data-reveal>The whole shelf</h2>
    <p data-reveal style="--i:1">${plural(shelfRepos.length, 'repository', 'repositories')}, newest push first. The color is the language. A spine with a write-up opens it here, the rest open on GitHub.</p>
  </div>
  <ul class="shelf" data-reveal>
    ${shelfRepos
      .map(
        (r) =>
          `<li><a class="spine ${langClass(r.language)}" href="${ctx.projects.has(r.name) ? `/projects/${esc(r.name)}/` : esc(r.url)}" title="${esc(r.description)}"><span>${esc(r.name)}</span><i>${esc(r.language || 'Docs')}</i></a></li>`,
      )
      .join('')}
  </ul>
</section>`;

  const books = `
<section class="books f-surface" data-field="f-surface" id="books">
  <div class="books-grid">
    <div class="books-text">
      <h2 data-reveal>Pages for Change</h2>
      <p class="role" data-reveal>${esc(c.p4c.role)}</p>
      <p data-reveal>${esc(c.p4c.text)}</p>
      <dl class="figures" data-reveal>
        <div><dt>${esc(p4c.books)}+</dt><dd>books collected so far${p4c.pages ? `, about ${esc(p4c.pages)} pages` : ''}</dd></div>
        ${p4c.drive ? `<div><dt>${esc(p4c.drive)}</dt><dd>of them in one Saturday. ${esc(c.p4c.event)}</dd></div>` : ''}
      </dl>
      <p class="small" data-reveal>${esc(c.p4c.sponsor)} Numbers read from ${link(c.p4c.site, 'pagesforchange.org')}${p4c.live ? '' : ` on ${when(c.p4c.fallback.asOf)}`}.</p>
      <p data-reveal><a class="button" href="${esc(c.p4c.site)}">Visit pagesforchange.org</a></p>
    </div>
    <div class="books-main shutter" data-reveal>${picture(ctx, 'p4c/p4c-1.webp', { sizes: '(min-width: 900px) 55vw, 100vw' })}</div>
  </div>
</section>`;

  const posts = (data.posts || []).slice(0, 6);
  const writing = posts.length
    ? `
<section class="writing" data-field="" id="writing">
  <div class="writing-grid">
    <div>
      <h2 data-reveal>Writing</h2>
      <p data-reveal>${plural(data.posts.length, 'post')} so far, each about one thing I built and what broke along the way.</p>
      <p class="more" data-reveal>${link('/writing/', 'All writing')} ${link('/feed.xml', 'Feed')}</p>
    </div>
    <ul class="titles">
      ${posts.map((p, i) => `<li data-reveal style="--i:${i % 3}"><a href="/writing/${esc(p.slug)}/">${esc(p.title)}</a>${when(p.publishedAt)}</li>`).join('\n      ')}
    </ul>
  </div>
</section>`
    : '';

  const wins = [
    ...c.about.wins.map((w) => [w.what, w.when]),
    ...(hnTop ? [[`mnemo on Hacker News, ${plural(hnTop.points, 'point')}`, monthText(hnTop.createdAt)]] : []),
    ...(mnemo ? [[`mnemo on GitHub, ${plural(mnemo.stars, 'star')}`, 'to date']] : []),
  ];
  const about = `
<section class="about" data-field="" id="about">
  <h2 class="sr-only">About</h2>
  <div class="about-row">
    <dl class="side" data-reveal>
      ${c.about.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>
    <p class="statement" data-reveal style="--i:1">${esc(c.about.paragraph)}</p>
  </div>
  <div class="about-row">
    <h3 data-reveal>On the record</h3>
    <div class="records">
      <ul data-reveal>
        ${wins.map(([what, year]) => `<li><span>${esc(what)}</span><span>${esc(year)}</span></li>`).join('\n        ')}
      </ul>
      <ul data-reveal style="--i:1">
        ${papers.map((p) => `<li><span><a href="/research/${esc(p.slug)}/">${esc(p.short)}</a></span><span>${esc(monthText(p.date))}</span></li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>`;

  const [user, host] = c.identity.email.split('@');
  const contact = `
<section class="contact f-moss" data-field="f-moss" id="contact">
  <h2 class="sr-only">Contact</h2>
  <p class="contact-say" data-reveal>${esc(c.seeking)} Write to me about either.</p>
  <a class="contact-mail" data-reveal href="mailto:${esc(c.identity.email)}"><span>${esc(user)}</span><span>@${esc(host)}</span></a>
  <div class="contact-foot">
    <p>${esc(c.identity.location)}<br><button type="button" class="textbutton" data-copy="${esc(c.identity.email)}">Copy the address</button></p>
    <p>${c.identity.links.slice(0, 4).map((l) => link(l.href, l.label)).join(' ')}</p>
  </div>
</section>`;

  return layout(
    ctx,
    {
      title: '',
      description: c.identity.line,
      path: '/',
      field: 'f-moss',
      bodyClass: 'home',
      jsonld: [person(c), { '@context': 'https://schema.org', '@type': 'WebSite', name: c.identity.name, url: `${ORIGIN}/` }],
    },
    hero + intro + research + poster + sims + now + shelf + books + writing + about + contact,
  );
}

const MATH_A = `<math display="block"><msubsup><mi>A</mi><mrow><mi>i</mi><mi>j</mi></mrow><mi>max</mi></msubsup><mo>=</mo><msub><mi>w</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>&#8290;</mo><msub><mi>k</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub></math>`;
const MATH_RHO = `<math><mi>&#961;</mi><mo>(</mo><msup><mi>A</mi><mi>max</mi></msup><mo>)</mo><mo>&lt;</mo><mn>1</mn></math>`;
const MATH_BOUND = `<math display="block"><mi>&#923;</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>&#8804;</mo><msup><mrow><mo>(</mo><mi>I</mi><mo>&#8722;</mo><msup><mrow><mo>(</mo><msup><mi>A</mi><mi>max</mi></msup><mo>)</mo></mrow><mi>T</mi></msup><mo>)</mo></mrow><mrow><mo>&#8722;</mo><mn>1</mn></mrow></msup><mo>&#8290;</mo><msub><mi>&#955;</mi><mi>ext</mi></msub><mo>(</mo><mi>t</mi><mo>)</mo></math>`;

function theorem(c) {
  const t = c.ongoing.theorem;
  return `<div class="theorem">
    <p>${esc(t.setup)}</p>
    ${MATH_A}
    <p>${esc(t.claim).replace('its spectral radius is below 1', `its spectral radius is below 1, ${MATH_RHO}`)}</p>
    ${MATH_BOUND}
    <p class="small">${esc(t.note)}</p>
  </div>`;
}

function explorer() {
  return `<div class="explorer" data-explorer data-ui>
    <div class="ex-controls">
      <fieldset>
        <legend>Service graph</legend>
        <label><input type="radio" name="ex-topo" value="chain"> Chain</label>
        <label><input type="radio" name="ex-topo" value="cycle" checked> Cycle</label>
        <label><input type="radio" name="ex-topo" value="star"> Hub and leaves</label>
      </fieldset>
      <label>Retry budget on every edge, k <output data-ex="kOut">3</output><input type="range" data-ex="k" min="1" max="8" step="1" value="3"></label>
      <label>Share of traffic on each cycle edge, w <output data-ex="wOut">0.20</output><input type="range" data-ex="w" min="0.05" max="0.5" step="0.05" value="0.2"></label>
      <label class="check"><input type="checkbox" data-ex="breaker"> Open a circuit breaker on one edge</label>
    </div>
    <div class="ex-view">
      <svg data-ex="svg" viewBox="0 0 600 340" role="img" aria-label="Service dependency graph for the selected settings"></svg>
      <p class="ex-read" aria-live="polite"><span data-ex="rho">Spectral radius 0.6</span><strong data-ex="verdict">Bounded. With one unit of outside load on every service, none can carry more than 2.5.</strong></p>
    </div>
    <p class="small">A toy version of the model in the draft: the static worst-case matrix only, with one unit of external load on every service. The default setting is one of the draft's hand-derived test fixtures, a three-service cycle with w = 0.2 and k = 3, where the spectral radius is exactly 0.6 and the ceiling is exactly 2.5 on each service.</p>
  </div>`;
}

function verdictTable(ctx, only) {
  const studies = ctx.verdicts.filter((v) => v.predictions?.length && (!only || v.repo === only));
  if (!studies.length) return '';
  return `<div class="scroll"><table class="record verdicts">
    <thead><tr><th scope="col">Study</th><th scope="col">Prediction</th><th scope="col">Outcome</th><th scope="col">What the data said</th></tr></thead>
    ${studies
      .map(
        (v) => `<tbody>
      ${v.predictions
        .map(
          (p, i) => `<tr>
        <td>${i === 0 ? link(`https://github.com/zaydmulani09/${v.repo}`, v.label) : ''}</td>
        <th scope="row">${esc(p.id)}. ${esc(p.claim)}</th>
        <td>${outcome(p.outcome)}</td>
        <td>${esc(p.evidence)}</td>
      </tr>`,
        )
        .join('\n      ')}
    </tbody>`,
      )
      .join('\n    ')}
  </table></div>`;
}

export function researchIndex(ctx) {
  const { c, data } = ctx;
  const papers = ctx.papers;
  const all = ctx.verdicts.flatMap((v) => v.predictions || []);
  const count = (o) => all.filter((p) => p.outcome === o).length;

  const timeline = [
    ...papers.flatMap((p) => [
      { at: p.date, text: `${p.short} dated on Zenodo`, href: `/research/${p.slug}/` },
      ...(p.ssrnAt ? [{ at: p.ssrnAt, text: `${p.short} registered on SSRN`, href: ssrnUrl(p.ssrn) }] : []),
    ]),
    ...ctx.verdicts
      .map((v) => ({ v, r: ctx.repo(v.repo) }))
      .filter(({ r }) => r)
      .map(({ v, r }) => ({ at: r.createdAt, text: `${v.label}: repository opened`, href: r.url })),
    ...['heterodyne'].map((n) => ctx.repo(n)).filter(Boolean).map((r) => ({ at: r.createdAt, text: `${r.name}: a tool to find which layer makes two runs disagree`, href: `/projects/${r.name}/` })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  const body = `
${pageHead({ title: 'Research', lead: esc(c.research.lead) })}
<section class="papers">
  <h2 class="sr-only">Papers</h2>
  ${papers
    .map(
      (p, i) => `<article class="paper${i % 2 ? ' flip' : ''}">
    <a class="paper-page" href="/research/${esc(p.slug)}/" data-reveal>${picture(ctx, `papers/${p.slug}-1200.webp`, { sizes: '(min-width: 900px) 34vw, 90vw', eager: i === 0, alt: `First page of the paper ${p.short}` })}</a>
    <div data-reveal style="--i:1">
      <p class="small">${esc(p.kind)}. ${when(p.date)}.</p>
      <h3><a href="/research/${esc(p.slug)}/">${esc(p.short)}</a></h3>
      <p class="sub">${esc(p.sub)}</p>
      <p>${esc(p.gist)}</p>
      <p class="actions"><a class="button" href="/research/${esc(p.slug)}/">Abstract and citation</a>${paperLinks(p)}</p>
    </div>
  </article>`,
    )
    .join('\n  ')}
</section>
<section class="ongoing f-inverse" data-field="f-inverse">
  <div class="sec-head">
    <h2 data-reveal>In progress</h2>
    <p data-reveal style="--i:1">${esc(c.ongoing.title)}. ${esc(c.ongoing.gist)} ${esc(c.ongoing.status)}</p>
  </div>
  <div class="ongoing-grid">
    <div data-reveal>${theorem(c)}<p class="more">${link(`/research/${c.ongoing.slug}/`, 'What I tested and what went wrong')}</p></div>
    <div data-reveal style="--i:1">${explorer()}</div>
  </div>
</section>
${
  all.length
    ? `<section class="outcomes">
  <div class="sec-head">
    <h2 data-reveal>Predictions and outcomes</h2>
    <p data-reveal style="--i:1">${plural(all.length, 'prediction')} across ${plural(ctx.verdicts.filter((v) => v.predictions?.length).length, 'study', 'studies')}, each written down before the result. ${num(count('supported'))} held up and ${num(count('refuted'))} did not. The table is copied from the repositories, where the predictions files have their own commit dates.</p>
  </div>
  <div data-reveal>${verdictTable(ctx)}</div>
</section>`
    : ''
}
<section class="timeline-sec f-surface" data-field="f-surface">
  <h2 data-reveal>Timeline</h2>
  <ol class="timeline">
    <li data-reveal><span>Now</span>${link(`/research/${c.ongoing.slug}/`, `${c.ongoing.title}: draft and simulation harness`)}</li>
    ${timeline.map((t) => `<li data-reveal>${when(t.at)}${link(t.href, t.text)}</li>`).join('\n    ')}
  </ol>
  <p class="small">Dates come from Zenodo, Crossref and GitHub at build time. ORCID ${link(`https://orcid.org/${c.identity.orcid}`, c.identity.orcid)}.</p>
</section>`;

  return layout(
    ctx,
    {
      title: 'Research',
      description: `${plural(papers.length, 'solo preprint')} and one paper in progress by Zayd Mulani, with every pre-registered prediction and its outcome.`,
      path: '/research/',
      og: '/og/research.png',
      scripts: `<script src="${esc(ctx.assets.explorer)}" defer></script>`,
      jsonld: [person(c)],
    },
    body,
  );
}

function bibtex(c, p) {
  const [y, m] = p.date.split('-');
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][+m - 1];
  return `@misc{${p.key},
  author    = {Mulani, Zayd},
  title     = {${p.title}},
  year      = {${y}},
  month     = ${month},
  publisher = {Zenodo},
  doi       = {${p.doi}},
  url       = {${doiUrl(p.doi)}}
}`;
}

export function paperPage(ctx, p) {
  const c = ctx.c;
  const cite = `Mulani, Z. (${p.date.slice(0, 4)}). ${p.title}. Zenodo. ${doiUrl(p.doi)}`;
  const verdicts = p.repo ? verdictTable(ctx, p.repo) : '';
  const extra = `<meta name="citation_title" content="${esc(p.title)}">
<meta name="citation_author" content="Mulani, Zayd">
<meta name="citation_publication_date" content="${esc(p.date.replace(/-/g, '/'))}">
<meta name="citation_doi" content="${esc(p.doi)}">
<meta name="citation_publisher" content="Zenodo">
${p.pdf ? `<meta name="citation_pdf_url" content="${esc(p.pdf)}">\n` : ''}`;
  const body = `
<article class="paper-full">
  ${pageHead({ title: esc(p.short), lead: esc(p.sub), small: `${esc(c.identity.name)}. ${esc(p.kind)}. ${when(p.date)}.${p.license ? ` ${esc(p.license.toUpperCase())}.` : ''}`, long: p.short.length > 40 })}
  <p class="actions" data-rise>${p.pdf ? `<a class="button" href="${esc(p.pdf)}">Read the PDF</a>` : ''}${link(doiUrl(p.doi), `doi:${p.doi}`)}${p.ssrn ? link(ssrnUrl(p.ssrn), `SSRN ${p.ssrn}`) : ''}${p.repo ? link(`https://github.com/zaydmulani09/${p.repo}`, 'Code and data') : ''}</p>
  <div class="paper-grid">
    <div class="paper-text">
      <h2>Abstract</h2>
      ${p.abstract.map((a) => `<p>${esc(a)}</p>`).join('\n      ')}
      ${p.keywords.length ? `<h2>Keywords</h2><p>${p.keywords.map(esc).join(', ')}.</p>` : ''}
      ${verdicts ? `<h2>Predictions and outcomes</h2>${verdicts}` : ''}
      <h2>Cite</h2>
      <p>${esc(cite)}</p>
      <div class="code-block"><pre><code id="bib">${esc(bibtex(c, p))}</code></pre><button type="button" class="button quiet" data-copy-from="bib">Copy BibTeX</button></div>
      ${p.views != null ? `<p class="small">${plural(p.views, 'unique view')} and ${plural(p.downloads, 'unique download')} on Zenodo as of this build.</p>` : ''}
    </div>
    <a class="paper-page" href="${esc(p.pdf || doiUrl(p.doi))}">${picture(ctx, `papers/${p.slug}-1200.webp`, { sizes: '(min-width: 900px) 34vw, 90vw', eager: true, alt: `First page of the paper ${p.short}` })}</a>
  </div>
  <p class="more">${link('/research/', 'All research')}</p>
</article>`;
  return layout(
    ctx,
    {
      title: p.short,
      description: p.gist,
      path: `/research/${p.slug}/`,
      og: `/og/research-${p.slug}.png`,
      type: 'article',
      extra,
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'ScholarlyArticle',
          headline: p.title,
          name: p.title,
          author: { '@type': 'Person', name: c.identity.name, url: `${ORIGIN}/`, identifier: `https://orcid.org/${c.identity.orcid}` },
          datePublished: p.date,
          abstract: p.abstract.join(' '),
          keywords: p.keywords.join(', '),
          identifier: doiUrl(p.doi),
          sameAs: [doiUrl(p.doi), ...(p.ssrn ? [`https://doi.org/10.2139/ssrn.${p.ssrn}`] : [])],
          url: `${ORIGIN}/research/${p.slug}/`,
          publisher: { '@type': 'Organization', name: 'Zenodo' },
        },
      ],
    },
    body,
  );
}

export function ongoingPage(ctx) {
  const c = ctx.c;
  const o = c.ongoing;
  const body = `
<article class="paper-full">
  ${pageHead({ title: esc(o.title), lead: esc(o.sub), small: `${esc(c.identity.name)}. ${esc(o.status)}`, long: true })}
  <div class="paper-grid">
    <div class="paper-text">
      <h2>What it is</h2>
      ${o.body.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
      <h2>The theorem</h2>
      ${theorem(c)}
      <h2>Simulation harness</h2>
      <p>The draft comes with ${plural(o.harness.length, 'Python file')}: ${o.harness.map((f) => `<code>${esc(f)}</code>`).join(', ')}. Every number in the draft is produced by one of them. The code is not public yet. It goes up with the paper.</p>
      <p class="small">If you work on reliability or queueing and would read a draft, ${link(`mailto:${c.identity.email}?subject=Retry-storm%20draft`, 'write to me')}.</p>
    </div>
    <div>${explorer()}</div>
  </div>
  <p class="more">${link('/research/', 'All research')}</p>
</article>`;
  return layout(
    ctx,
    {
      title: o.title,
      description: o.gist,
      path: `/research/${o.slug}/`,
      og: `/og/research-${o.slug}.png`,
      type: 'article',
      scripts: `<script src="${esc(ctx.assets.explorer)}" defer></script>`,
    },
    body,
  );
}

const KIND_LABEL = { tool: 'Tools', library: 'Libraries', app: 'Apps', simulation: 'Simulations', research: 'Research code', data: 'Data work' };

export function projectsIndex(ctx) {
  const { c, data } = ctx;
  const pages = ctx.projectPages;
  const groups = Object.keys(KIND_LABEL)
    .map((k) => [k, pages.filter((x) => x.p.kind === k)])
    .filter(([, list]) => list.length);
  const rest = data.repos.filter((r) => !ctx.projects.has(r.name) && r.description && !c.shelfSkip.includes(r.name));
  const body = `
${pageHead({ title: 'Projects', lead: `${plural(pages.length, 'project')} with a write-up, and ${plural(rest.length, 'more repository', 'more repositories')} on GitHub. Stars, releases and dates are fetched at build time.` })}
${groups
  .map(
    ([k, list]) => `<section class="group">
  <h2 data-reveal>${KIND_LABEL[k]}</h2>
  <ul class="index">
    ${list
      .map(
        ({ r, p }) =>
          `<li data-reveal><a href="/projects/${esc(r.name)}/">${esc(r.name)}</a><span>${esc(p.one)}</span><span>${esc(repoFacts(r))}</span></li>`,
      )
      .join('\n    ')}
  </ul>
</section>`,
  )
  .join('\n')}
<section class="group f-surface" data-field="f-surface">
  <h2 data-reveal>Also on GitHub</h2>
  <div class="scroll"><table class="record" data-reveal>
    <thead><tr><th scope="col">Repository</th><th scope="col">What it is</th><th scope="col">Language</th><th scope="col">Last push</th></tr></thead>
    <tbody>
      ${rest.map((r) => `<tr><th scope="row">${link(r.url, r.name)}</th><td>${esc(r.description)}</td><td>${esc(r.language)}</td><td>${when(r.pushedAt, monthText)}</td></tr>`).join('\n      ')}
    </tbody>
  </table></div>
</section>`;
  return layout(
    ctx,
    { title: 'Projects', description: `${plural(pages.length, 'project')} by Zayd Mulani: Rust tools, browser GPU simulations, apps and research code, with live numbers from GitHub.`, path: '/projects/', og: '/og/projects.png' },
    body,
  );
}

export function projectPage(ctx, entry, prev, next) {
  const { c } = ctx;
  const { r, p, d, crate, npm } = entry;
  const demo = ctx.demo(r.name);
  const sim = c.sims.find((s) => s.repo === r.name);
  const shot = c.shots.includes(r.name) ? picture(ctx, `shots/${r.name}-1600.webp`, { sizes: '(min-width: 900px) 62vw, 100vw', eager: true }) : '';
  const related = (ctx.data.posts || []).filter((post) => post.repos?.includes(r.name));
  const paper = ctx.papers.find((x) => x.repo === r.name);
  const side = [
    ['Language', r.language],
    ['Stars', r.stars ? num(r.stars) : ''],
    ['License', r.license],
    ['Latest release', d?.release ? link(d.release.url, d.release.tag) : '', true],
    ['On crates.io', crate ? `${link(crate.url, `v${crate.version}`)}, ${plural(crate.downloads, 'download')}` : '', true],
    ['On npm', npm ? `${link(npm.url, `v${npm.version}`)}${npm.monthly != null ? `, ${plural(npm.monthly, 'download')} last month` : ''}` : '', true],
    ['First commit', r.createdAt ? when(r.createdAt, monthText) : '', true],
    ['Last push', r.pushedAt ? when(r.pushedAt) : '', true],
  ].filter(([, v]) => v);

  const body = `
<article class="project">
  ${pageHead({ title: esc(r.name), lead: esc(p.one) })}
  <p class="actions" data-rise><a class="button" href="${esc(r.url)}">Source on GitHub</a>${demo && !sim ? link(demo, 'Open the live version') : ''}${paper ? link(`/research/${paper.slug}/`, 'Read the paper') : ''}${p.links?.docs ? link(p.links.docs, 'Docs') : ''}</p>
  ${sim ? `<div class="project-stage f-black">${stage(ctx, sim, r, true)}${sim.embedNote ? `<p class="small">${esc(sim.embedNote)}</p>` : ''}</div>` : shot ? `<div class="project-shot shutter is-in">${shot}</div>` : ''}
  <div class="about-row">
    <dl class="side">
      ${side.map(([k, v, raw]) => `<div><dt>${esc(k)}</dt><dd>${raw ? v : esc(v)}</dd></div>`).join('\n      ')}
    </dl>
    <div class="prose">
      ${p.body.map((t) => `<p>${esc(t)}</p>`).join('\n      ')}
      ${p.install ? `<h2>Run it</h2><div class="code-block"><pre><code>${esc(p.install)}</code></pre></div>` : ''}
      ${
        p.facts?.length
          ? `<h2>Measured</h2>
      <table class="record facts"><tbody>${p.facts.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
      <p class="small">Copied from the repository, where the method is written down.</p>`
          : ''
      }
      ${p.limits ? `<h2>Where it stops</h2><p>${esc(p.limits)}</p>` : ''}
      ${d?.head ? `<h2>Latest commit</h2><p><q>${esc(d.head.message)}</q> ${link(d.head.url, d.head.sha)}, ${when(d.head.date)}.</p>` : ''}
      ${related.length ? `<h2>Written up</h2><ul>${related.map((post) => `<li>${link(`/writing/${post.slug}/`, post.title)}</li>`).join('')}</ul>` : ''}
    </div>
  </div>
  ${d?.readme ? `<details class="readme"><summary>Read the README</summary><div class="prose fetched">${d.readme}</div></details>` : ''}
  <nav class="pager" aria-label="More projects">${prev ? `<a href="/projects/${esc(prev.r.name)}/"><span>Previous</span>${esc(prev.r.name)}</a>` : '<span></span>'}${next ? `<a href="/projects/${esc(next.r.name)}/"><span>Next</span>${esc(next.r.name)}</a>` : ''}</nav>
</article>`;
  return layout(
    ctx,
    {
      title: r.name,
      description: p.one,
      path: `/projects/${r.name}/`,
      og: `/og/projects-${r.name}.png`,
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: r.name,
          description: p.one,
          codeRepository: r.url,
          programmingLanguage: r.language || undefined,
          license: r.license || undefined,
          author: { '@type': 'Person', name: c.identity.name, url: `${ORIGIN}/` },
          url: `${ORIGIN}/projects/${r.name}/`,
        },
      ],
    },
    body,
  );
}

export function writingIndex(ctx) {
  const { data } = ctx;
  const posts = data.posts || [];
  const body = `
${pageHead({ title: 'Writing', lead: `${plural(posts.length, 'post')}. Each is about one thing I built, how it works and what broke. They are first published on dev.to and kept here in full.` })}
<section class="group">
  <h2 class="sr-only">Posts</h2>
  <ul class="titles wide">
    ${posts.map((p) => `<li data-reveal><a href="/writing/${esc(p.slug)}/">${esc(p.title)}</a><span>${p.minutes} min</span>${when(p.publishedAt)}</li>`).join('\n    ')}
  </ul>
  <p class="more">${link('/feed.xml', 'Subscribe to the feed')}</p>
</section>
${
  data.hn?.length
    ? `<section class="group f-surface" data-field="f-surface">
  <h2 data-reveal>Discussed on Hacker News</h2>
  <ul class="rows">
    ${data.hn.map((h) => `<li data-reveal><a href="${esc(h.url)}">${esc(h.title)}</a><span>${plural(h.points, 'point')}, ${plural(h.comments, 'comment')}</span>${when(h.createdAt)}</li>`).join('\n    ')}
  </ul>
</section>`
    : ''
}`;
  return layout(ctx, { title: 'Writing', description: `${plural(posts.length, 'post')} by Zayd Mulani about building Rust tools, databases, fuzzers and local language-model tooling.`, path: '/writing/', og: '/og/writing.png' }, body);
}

export function postPage(ctx, post, prev, next) {
  const c = ctx.c;
  const projects = (post.repos || []).filter((n) => ctx.projects.has(n));
  const body = `
<article class="post">
  ${pageHead({ title: esc(post.title), small: `${when(post.publishedAt)}. ${post.minutes} min read. First published on ${link(post.url, 'dev.to')}.`, long: true })}
  <div class="prose fetched">${post.html || `<p>${esc(post.description)}</p><p>${link(post.url, 'Read it on dev.to')}.</p>`}</div>
  ${projects.length ? `<p class="more">The project: ${projects.map((n) => link(`/projects/${n}/`, n)).join(' ')}</p>` : ''}
  <nav class="pager" aria-label="More writing">${prev ? `<a href="/writing/${esc(prev.slug)}/"><span>Newer</span>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="/writing/${esc(next.slug)}/"><span>Older</span>${esc(next.title)}</a>` : ''}</nav>
</article>`;
  return layout(
    ctx,
    {
      title: post.title,
      description: post.description || post.title,
      path: `/writing/${post.slug}/`,
      og: `/og/writing-${post.slug}.png`,
      type: 'article',
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          datePublished: post.publishedAt,
          author: { '@type': 'Person', name: c.identity.name, url: `${ORIGIN}/` },
          url: `${ORIGIN}/writing/${post.slug}/`,
          sameAs: post.url,
        },
      ],
    },
    body,
  );
}

export function archivePage(ctx) {
  const c = ctx.c;
  const body = `
${pageHead({ title: 'Past versions', lead: `Old versions of this site stay up at their own paths, frozen, as a record of what I thought looked right at the time. This is version ${c.version.current}.` })}
<section class="group">
  <ul class="index">
    ${c.version.past.map((v) => `<li><a href="${esc(v.path)}">Version ${v.n}</a><span>${esc(v.note)}</span><span>Retired ${when(v.retired)}</span></li>`).join('\n    ')}
  </ul>
</section>`;
  return layout(ctx, { title: 'Past versions', description: 'Earlier versions of zayd.dpdns.org, still served and unchanged.', path: '/archive/', og: '/og/archive.png' }, body);
}

export function notFound(ctx) {
  const body = `
${pageHead({ title: 'Nothing here', lead: 'That address does not match a page on this site. It may have moved when the site was rebuilt.' })}
<section class="group">
  <p class="actions"><a class="button" href="/">Go to the front page</a>${link('/projects/', 'Projects')}${link('/research/', 'Research')}${link('/writing/', 'Writing')}</p>
</section>`;
  return layout(ctx, { title: 'Not found', description: 'This page does not exist.', path: '/404.html' }, body).replace('<meta name="author"', '<meta name="robots" content="noindex">\n<meta name="author"');
}

const xml = (s) => esc(s).replace(/'/g, '&apos;');

export function writingFeed(ctx) {
  const c = ctx.c;
  const posts = ctx.data.posts || [];
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xml(c.identity.name)}: writing</title>
  <link href="${ORIGIN}/feed.xml" rel="self"/>
  <link href="${ORIGIN}/writing/"/>
  <id>${ORIGIN}/writing/</id>
  <updated>${new Date(posts[0]?.publishedAt || ctx.meta.generatedAt).toISOString()}</updated>
  <author><name>${xml(c.identity.name)}</name></author>
${posts
  .map(
    (p) => `  <entry>
    <title>${xml(p.title)}</title>
    <link href="${ORIGIN}/writing/${p.slug}/"/>
    <id>${ORIGIN}/writing/${p.slug}/</id>
    <published>${new Date(p.publishedAt).toISOString()}</published>
    <updated>${new Date(p.publishedAt).toISOString()}</updated>
    <summary>${xml(p.description)}</summary>
  </entry>`,
  )
  .join('\n')}
</feed>
`;
}

export function releaseFeed(ctx) {
  const c = ctx.c;
  const releases = ctx.projectPages
    .filter((x) => x.d?.release)
    .map((x) => ({ repo: x.r.name, ...x.d.release }))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xml(c.identity.name)}: releases</title>
  <link href="${ORIGIN}/releases.xml" rel="self"/>
  <link href="${ORIGIN}/projects/"/>
  <id>${ORIGIN}/releases.xml</id>
  <updated>${new Date(releases[0]?.publishedAt || ctx.meta.generatedAt).toISOString()}</updated>
  <author><name>${xml(c.identity.name)}</name></author>
${releases
  .map(
    (r) => `  <entry>
    <title>${xml(r.repo)} ${xml(r.tag)}</title>
    <link href="${xml(r.url)}"/>
    <id>${xml(r.url)}</id>
    <updated>${new Date(r.publishedAt).toISOString()}</updated>
    <summary>${xml(r.repo)} released ${xml(r.tag)}.</summary>
  </entry>`,
  )
  .join('\n')}
</feed>
`;
}

export function sitemap(paths, day) {
  return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${ORIGIN}${p}</loc><lastmod>${day}</lastmod></url>`).join('\n')}
</urlset>
`;
}

export function searchIndex(ctx) {
  const c = ctx.c;
  return [
    { t: 'Home', u: '/', k: 'Page' },
    { t: 'Research', u: '/research/', k: 'Page' },
    { t: 'Projects', u: '/projects/', k: 'Page' },
    { t: 'Writing', u: '/writing/', k: 'Page' },
    { t: 'Contact', u: '/#contact', k: 'Page' },
    { t: 'Pages for Change', u: '/#books', k: 'Page' },
    { t: 'Past versions', u: '/archive/', k: 'Page' },
    ...ctx.papers.map((p) => ({ t: p.short, u: `/research/${p.slug}/`, k: 'Paper' })),
    { t: c.ongoing.title, u: `/research/${c.ongoing.slug}/`, k: 'Paper' },
    ...ctx.projectPages.map((x) => ({ t: x.r.name, u: `/projects/${x.r.name}/`, k: 'Project', d: x.p.one })),
    ...(ctx.data.posts || []).map((p) => ({ t: p.title, u: `/writing/${p.slug}/`, k: 'Post' })),
  ];
}
