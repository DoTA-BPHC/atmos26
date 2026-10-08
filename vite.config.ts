import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { EVENTS, eventSummary } from './src/data/events.ts'
import { FEST } from './src/data/fest.ts'
import { PROSHOWS } from './src/data/proshows.ts'
import { TITLE_SPONSOR } from './src/data/sponsors.ts'

// the domain index.html is written with; FEST.url replaces it at build time
const HTML_ORIGIN = 'https://atmos26.vercel.app'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// swaps the page title, description, canonical and share-card tags in the built index.html
function withMeta(html: string, url: string, title: string, description: string) {
  const set = (h: string, key: string, value: string) =>
    h.replace(new RegExp(`(${key}" content=")[^"]*`), `$1${esc(value)}`)
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  out = out.replace(/(<link rel="canonical" href=")[^"]*/, `$1${esc(url)}`)
  out = set(out, 'name="description', description)
  out = set(out, 'property="og:url', url)
  out = set(out, 'property="og:title', title)
  out = set(out, 'property="og:description', description)
  out = set(out, 'name="twitter:title', title)
  out = set(out, 'name="twitter:description', description)
  return out
}

// Share cards are read by crawlers that don't run JS, so every route gets its
// own copy of index.html with its own title and description. Vercel serves
// these files as they are; anything else gets 404.html (a real 404 that still
// boots the app's "Signal lost" page). Also writes sitemap.xml and robots.txt.
function sitePages(): Plugin {
  let outDir = 'dist'
  let building = false
  return {
    name: 'site-pages',
    configResolved(config) {
      outDir = config.build.outDir
      building = config.command === 'build'
    },
    transformIndexHtml(html) {
      return html.replaceAll(HTML_ORIGIN, FEST.url)
    },
    closeBundle() {
      if (!building) return
      const html = readFileSync(join(outDir, 'index.html'), 'utf-8')
      const where = `BITS Pilani, Hyderabad Campus · 23–25 October 2026`
      const paths = ['']
      const page = (path: string, title: string, description: string) => {
        mkdirSync(join(outDir, path), { recursive: true })
        writeFileSync(join(outDir, path, 'index.html'), withMeta(html, `${FEST.url}/${path}`, title, description))
        paths.push(path)
      }

      const artists = PROSHOWS.filter((p) => p.artist).map((p) => p.artist)
      page('events', 'Events · ATMOS ’26', `${EVENTS.length} competitions, workshops and experiences. ${where}.`)
      page(
        'proshows',
        'Proshows · ATMOS ’26',
        artists.length
          ? `Three nights on the main stage: ${artists.join(', ')}. ${where}.`
          : `Three nights on the main stage. The line-up stays sealed until the reveal. ${where}.`,
      )
      page('gallery', 'Gallery · ATMOS ’26', 'Photos from past editions of ATMOS, the technical fest of BITS Pilani, Hyderabad Campus.')
      page(
        'sponsors',
        'Sponsors · ATMOS ’26',
        [TITLE_SPONSOR && `Title sponsor: ${TITLE_SPONSOR.name}`, 'Partner with ATMOS ’26', where].filter(Boolean).join('. ') + '.',
      )
      page('contact', 'Contact · ATMOS ’26', `Write to the ATMOS ’26 team or find us on Instagram. ${where}.`)
      for (const e of EVENTS) page(`events/${e.id}`, `${e.title} · ATMOS ’26`, [eventSummary(e), where].filter(Boolean).join('. ') + '.')

      // unknown URLs: no canonical, not indexed
      const lost = withMeta(html, FEST.url, 'Page not found · ATMOS ’26', 'This page never made it through the convergence.')
        .replace(/\s*<link rel="canonical"[^>]*>/, '')
        .replace('<meta name="theme-color"', '<meta name="robots" content="noindex" />\n    <meta name="theme-color"')
      writeFileSync(join(outDir, '404.html'), lost)

      const urls = paths.map((p) => `  <url><loc>${FEST.url}/${p}</loc></url>`).join('\n')
      writeFileSync(
        join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      )
      writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${FEST.url}/sitemap.xml\n`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), sitePages()],
})
