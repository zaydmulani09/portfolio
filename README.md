# Zayd Mulani — Developer Portfolio

Visual premise: a print-editorial technical dossier. The site treats each repository as evidence, not decoration: large typography creates hierarchy, restrained color separates signal from supporting material, and the flagship projects use diagrams as small proof surfaces.

## Layout

- `site/` — the published static site (HTML, CSS, JS, assets, `CNAME`).
- `.github/workflows/deploy.yml` — GitHub Pages deploy: uploads `site/` as-is (no build step).

## Run locally

No build step is required.

- Open `site/index.html` directly, or
- serve the `site/` directory with any static HTTP server, e.g. `npx serve site`.

## Deployment

Static site on GitHub Pages, served at the custom domain **https://zayd.dpdns.org/** (root). The domain is carried by `site/CNAME`; canonical URL, Open Graph tags, `robots.txt`, and `sitemap.xml` all point at that origin.

## Engineering notes

- Semantic HTML5
- Plain CSS
- Small vanilla JS for progressive enhancement
- No analytics
- No client framework
- No API keys
- No render-blocking font CDN
- Reduced-motion support
- Keyboard-visible focus states
- Skip link
- Responsive down to 320px
- SVG social-share card and favicon
