// Real use, from real logs only: downloads of the packaged app (gloz.ehpk) counted by GitHub.
// Until 27 Nov 2026 Gloz's own checks downloaded the package every hour, so those downloads are not people:
// the count that matters is the downloads since then (eval/usage-baseline.json).
//   node scripts/usage.mjs     writes eval/results/usage.json
import { readFileSync, writeFileSync } from 'node:fs'

const base = JSON.parse(readFileSync(new URL('../eval/usage-baseline.json', import.meta.url), 'utf8'))
const r = await fetch('https://api.github.com/repos/drexthealpha/gloz/releases?per_page=100', { headers: { 'user-agent': 'gloz-usage' } })
if (!r.ok) { console.log(`GitHub answered ${r.status}; nothing written`); process.exit(1) }
const total = (await r.json()).flatMap(x => x.assets).filter(a => a.name === 'gloz.ehpk').reduce((n, a) => n + a.download_count, 0)
const out = { at: new Date().toISOString().slice(0, 10), downloads: total, since: base.at, downloadsSince: total - base.downloads, why: base.why }
writeFileSync(new URL('../eval/results/usage.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(out)
