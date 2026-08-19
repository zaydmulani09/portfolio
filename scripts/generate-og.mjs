// Generates public/og-image.png (1200x630) in the datasheet style.
// Run: node scripts/generate-og.mjs
//
// Notes on fonts: resvg reads TTF/OTF from disk (not woff2, and its
// fontBuffers path proved unreliable here), so we decompress the self-hosted
// woff2 faces to temp TTFs and load them via fontFiles. fontsource bakes the
// weight into the family name, so the mono 500 face is "IBM Plex Mono Medium".
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import wawoff2 from 'wawoff2';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const fontDir = join(root, 'public', 'fonts');

const tmpFonts = join(tmpdir(), 'portfolio-og-fonts');
mkdirSync(tmpFonts, { recursive: true });

async function toTtf(name) {
  const ttf = Buffer.from(
    await wawoff2.decompress(readFileSync(join(fontDir, name + '.woff2'))),
  );
  const out = join(tmpFonts, name + '.ttf');
  writeFileSync(out, ttf);
  return out;
}

const fontFiles = await Promise.all(
  [
    'ibm-plex-mono-latin-400-normal',
    'ibm-plex-mono-latin-500-normal',
    'ibm-plex-sans-latin-400-normal',
  ].map(toTtf),
);

// Tokens (DESIGN.md)
const paper = '#F5F5F3';
const ink = '#17181B';
const muted = '#5F6167';
const rule = '#D8D8D2';
const accent = '#D42A1C';

// Family names as registered by fontdb (weight baked in for the 500 face).
const MONO = 'IBM Plex Mono Medium';
const SANS = 'IBM Plex Sans';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${paper}"/>

  <!-- Registration / crop-mark ticks at corners (ink) -->
  <g fill="none" stroke="${ink}" stroke-width="3">
    <path d="M64 64 h34 M64 64 v34"/>
    <path d="M1136 64 h-34 M1136 64 v34"/>
    <path d="M64 566 h34 M64 566 v-34"/>
    <path d="M1136 566 h-34 M1136 566 v-34"/>
  </g>

  <!-- Single accent registration tick -->
  <rect x="80" y="150" width="16" height="16" fill="${accent}"/>

  <!-- Name -->
  <text x="80" y="330" font-family="${MONO}"
        font-size="96" letter-spacing="-2" fill="${ink}">Zayd Mulani</text>

  <!-- Tagline (manual wrap) -->
  <text font-family="${SANS}" font-size="34" fill="${muted}">
    <tspan x="82" y="400">I build local-first, inspectable</tspan>
    <tspan x="82" y="446">infrastructure for the AI-agent era.</tspan>
  </text>

  <!-- Divider rule -->
  <line x1="80" y1="502" x2="1120" y2="502" stroke="${rule}" stroke-width="2"/>

  <!-- Spec fields -->
  <text font-family="${MONO}" font-size="22" letter-spacing="1.6">
    <tspan x="82" y="556" fill="${muted}">LOCATION </tspan><tspan fill="${ink}">New Jersey, US</tspan>
    <tspan x="82" y="596" fill="${muted}">FOCUS </tspan><tspan fill="${ink}">local-first AI-agent infrastructure</tspan>
  </text>
</svg>`;

const resvg = new Resvg(svg, {
  background: paper,
  fitTo: { mode: 'width', value: 1200 },
  font: {
    fontFiles,
    loadSystemFonts: false,
    defaultFontFamily: SANS,
  },
});

const png = resvg.render().asPng();
writeFileSync(join(root, 'public', 'og-image.png'), png);
console.log('Wrote public/og-image.png', png.length, 'bytes');
