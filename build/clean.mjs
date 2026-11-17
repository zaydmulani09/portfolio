import { undashHtml, fetchImage } from './sources.mjs';

const BADGE = /shields\.io|badge|actions\/workflows|img\.shields|codecov|badgen|star-history|komarev|vercel\.com\/button/i;

function strip(html) {
  return html
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const real = tag.match(/\sdata-canonical-src="([^"]*)"/i)?.[1];
      return real ? tag.replace(/\ssrc="[^"]*"/i, ` src="${real}"`) : tag;
    })
    .replace(/<(script|style|iframe|form|object|embed|svg|clipboard-copy|g-emoji|video|audio|template)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(input|source|link|meta)\b[^>]*>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\s(style|tabindex|dir|id|itemprop|data-[\w-]+|aria-label|aria-hidden|rel|target|name)="[^"]*"/gi, '')
    .replace(/<a\b[^>]*class="anchor"[^>]*>\s*<\/a>/gi, '')
    .replace(/<a\b[^>]*>\s*<\/a>/gi, '')
    .replace(/<div class="highlight__panel[^"]*">\s*(<div class="highlight__panel-action[^"]*">\s*<\/div>\s*)*<\/div>/gi, '')
    .replace(/<div class="zeroclipboard-container[^"]*">\s*<\/div>/gi, '');
}

function headings(html, base) {
  const used = [...new Set([...html.matchAll(/<h([1-6])\b/gi)].map((m) => +m[1]))].sort();
  let prev = base - 1;
  const open = [];
  return html.replace(/<(\/?)h([1-6])\b([^>]*)>/gi, (m, close, level, attrs) => {
    if (close) return `</h${open.pop() || base}>`;
    const next = Math.min(6, prev + 1, base + used.indexOf(+level));
    prev = next;
    open.push(next);
    return `<h${next}${attrs}>`;
  });
}

const tables = (html) => html.replace(/<table\b/gi, '<div class="scroll"><table').replace(/<\/table>/gi, '</table></div>');

function absolutize(html, repoUrl, rawUrl) {
  return html
    .replace(/(<a\b[^>]*\shref=")([^"]*)"/gi, (m, pre, href) => {
      if (/^(https?:|mailto:|#)/i.test(href)) return `${pre}${href}"`;
      return `${pre}${repoUrl}/blob/HEAD/${href.replace(/^\.?\//, '')}"`;
    })
    .replace(/(<img\b[^>]*\ssrc=")([^"]*)"/gi, (m, pre, src) => {
      if (/^(https?:|data:)/i.test(src)) return `${pre}${src}"`;
      return `${pre}${rawUrl}/${src.replace(/^\.?\//, '')}"`;
    });
}

export function cleanReadme(html, user, repo) {
  const body = html.match(/<article[^>]*>([\s\S]*)<\/article>/i)?.[1] ?? html;
  const abs = absolutize(body, `https://github.com/${user}/${repo}`, `https://raw.githubusercontent.com/${user}/${repo}/HEAD`);
  return undashHtml(tables(headings(strip(abs), 3)));
}

export function cleanPost(html) {
  return undashHtml(tables(headings(strip(html), 2)));
}

export async function localize(html, save) {
  const tags = [...new Set(html.match(/<img\b[^>]*>/gi) || [])];
  const swaps = await Promise.all(
    tags.map(async (tag) => {
      const src = tag.match(/\ssrc="([^"]*)"/i)?.[1]?.replace(/&amp;/g, '&') || '';
      const alt = tag.match(/\salt="([^"]*)"/i)?.[1] || '';
      if (!src || BADGE.test(src) || BADGE.test(alt)) return [tag, ''];
      const img = /^https?:/i.test(src) ? await fetchImage(src) : null;
      if (!img) return [tag, alt ? `<span class="img-missing">Image: ${alt}</span>` : ''];
      const path = await save(img);
      const dims = img.width ? ` width="${img.width}" height="${img.height}"` : '';
      return [tag, `<img src="${path}" alt="${alt}"${dims} loading="lazy" decoding="async">`];
    }),
  );
  let out = html;
  for (const [from, to] of swaps) out = out.split(from).join(to);
  return out
    .replace(/<a\b[^>]*>\s*(<img\b[^>]*>)\s*<\/a>/gi, '$1')
    .replace(/<a\b[^>]*>\s*<\/a>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '');
}
