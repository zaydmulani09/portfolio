import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const fonts = join(dirname(fileURLToPath(import.meta.url)), 'fonts');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text, perLine, maxLines) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && (line + ' ' + word).length > perLine) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.:;]+\S*$/, '')}...`;
  }
  return lines;
}

export async function ogImage({ title, sub = '', kind = '', big = false }) {
  const size = big && title.length <= 16 ? 190 : title.length <= 30 ? 108 : title.length <= 70 ? 76 : 60;
  const titleLines = wrap(title, Math.floor(1060 / (size * 0.5)), size >= 108 ? 2 : 4);
  const subLines = sub ? wrap(sub, 62, 2) : [];
  const top = 150 + size * 0.8;
  const titleSvg = titleLines.map((l, i) => `<text x="70" y="${top + i * size * 0.98}" font-size="${size}" font-weight="500" letter-spacing="${-size * 0.04}" fill="${i === 0 ? '#f3f0e6' : '#0b0e07'}">${esc(l)}</text>`).join('');
  const subTop = 520 - (subLines.length - 1) * 40;
  const subSvg = subLines.map((l, i) => `<text x="70" y="${subTop + i * 40}" font-size="30" fill="#f3f0e6">${esc(l)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Hanken Grotesk">
<rect width="1200" height="630" fill="#536b39"/>
<text x="70" y="86" font-size="30" font-weight="500" fill="#f3f0e6">Zayd Mulani</text>
<text x="1130" y="86" font-size="30" text-anchor="end" fill="#f3f0e6">${esc(kind || 'zayd.dpdns.org')}</text>
${titleSvg}
${subSvg}
<text x="1130" y="580" font-size="26" text-anchor="end" fill="#0b0e07">zayd.dpdns.org</text>
</svg>`;
  const png = new Resvg(svg, {
    font: { fontFiles: [join(fonts, 'HankenGrotesk-400.ttf'), join(fonts, 'HankenGrotesk-500.ttf')], loadSystemFonts: false, defaultFontFamily: 'Hanken Grotesk' },
  });
  return png.render().asPng();
}
