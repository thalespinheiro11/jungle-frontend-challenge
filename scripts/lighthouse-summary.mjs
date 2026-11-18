// Summarizes the Lighthouse reports in lighthouse/{mobile,desktop} into lighthouse/SUMMARY.md:
// median of each category and of LCP/CLS/TBT/FCP per page and profile, plus the tool
// versions, environment and throttling settings of the runs. Run: npm run lighthouse:summary
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve('lighthouse')
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = [
  ['performance', 'Performance', 90],
  ['accessibility', 'Accessibility', 95],
  ['best-practices', 'Best Practices', 95],
  ['seo', 'SEO', 90],
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const rows = []
let sample = null
for (const profile of PROFILES) {
  const dir = path.join(ROOT, profile)
  const byPage = new Map()
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.report.json'))) {
    const lhr = JSON.parse(readFileSync(path.join(dir, file), 'utf8'))
    sample ??= lhr
    const page = new URL(lhr.finalDisplayedUrl).pathname
    if (!byPage.has(page)) byPage.set(page, [])
    byPage.get(page).push(lhr)
  }
  for (const [page, runs] of [...byPage].sort()) {
    const cat = (id) => median(runs.map((r) => Math.round(r.categories[id].score * 100)))
    const metric = (id) => median(runs.map((r) => r.audits[id].numericValue))
    rows.push({
      profile,
      page,
      runs: runs.length,
      scores: Object.fromEntries(CATEGORIES.map(([id]) => [id, cat(id)])),
      perRun: runs.map((r) => Math.round(r.categories.performance.score * 100)).join(' / '),
      lcp: metric('largest-contentful-paint'),
      cls: metric('cumulative-layout-shift'),
      tbt: metric('total-blocking-time'),
      fcp: metric('first-contentful-paint'),
    })
  }
}

const mark = (value, target) => (value >= target ? `${value}` : `**${value}**`)
const throttling = (profile) => {
  const lhr = JSON.parse(
    readFileSync(
      path.join(
        ROOT,
        profile,
        readdirSync(path.join(ROOT, profile)).find((f) => f.endsWith('.report.json')),
      ),
      'utf8',
    ),
  )
  const t = lhr.configSettings.throttling
  return `${lhr.configSettings.formFactor}, ${lhr.configSettings.throttlingMethod}: RTT ${t.rttMs} ms, ${Math.round((t.throughputKbps / 1024) * 10) / 10} Mbps, CPU ${t.cpuSlowdownMultiplier}×, tela ${lhr.configSettings.screenEmulation.width}×${lhr.configSettings.screenEmulation.height}`
}

const lines = [
  '# Lighthouse — resultados',
  '',
  'Mediana de 3 execuções por página e perfil, sobre o build otimizado (`npm run build` +',
  '`vite preview`) com o cenário padrão dos mocks. Valores abaixo da meta em **negrito**.',
  'Gerado por `npm run lighthouse:summary` a partir dos relatórios desta pasta.',
  '',
  '| Perfil | Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | Performance por execução |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ...rows.map(
    (r) =>
      `| ${r.profile} | \`${r.page}\` | ${CATEGORIES.map(([id, , target]) => mark(r.scores[id], target)).join(' | ')} | ${(r.lcp / 1000).toFixed(1)} s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms | ${(r.fcp / 1000).toFixed(1)} s | ${r.perRun} |`,
  ),
  '',
  'Metas: Performance ≥ 90 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 90.',
  '',
  '## Ambiente e condições',
  '',
  `- Lighthouse ${sample.lighthouseVersion} (via @lhci/cli), ${sample.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0] ?? 'Chrome'} headless`,
  `- Sistema: ${os.type()} ${os.release()} (${os.arch()}), ${os.cpus()[0]?.model.trim()}, Node ${process.version}`,
  `- Mobile: ${throttling('mobile')}`,
  `- Desktop: ${throttling('desktop')}`,
  '- Configuração versionada: `lighthouserc.mobile.json` e `lighthouserc.desktop.json`',
  '- Cada execução parte de um navegador limpo (sem cache nem Service Worker registrado).',
  '',
]

writeFileSync(path.join(ROOT, 'SUMMARY.md'), lines.join('\n'))
console.log(lines.slice(6, 6 + rows.length + 2).join('\n'))
