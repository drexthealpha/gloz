// Fills the generated blocks of README.md from eval/results, so every number
// on the page comes from a command anyone can run.
//   node scripts/readme.mjs          rewrite the blocks
//   node scripts/readme.mjs --check  fail if README.md differs from what the results say
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { complaintRows } from '../eval/rows.mjs'

const R = n => new URL(`../eval/results/${n}`, import.meta.url)
const read = n => existsSync(R(n)) ? readFileSync(R(n), 'utf8') : null
const json = n => existsSync(R(n)) ? JSON.parse(readFileSync(R(n), 'utf8')) : null

const blocks = {}
const h = json('heldout.json')
const t = json('time.json')
const v = json('video.json')
// A missing result file fails the check: a page must never keep an old number silently.
const missing = ['heldout.json', 'heldout.md', 'time.json', 'time.md', 'video.json', 'complaints.json', 'cost.json'].filter(n => !existsSync(R(n)))
if (missing.length) { console.log('missing result files:', missing.join(', ')); process.exit(1) }
blocks.video = `${v.seconds} s`
// The most one AI draft can cost, from `node eval/cost.mjs` (largest prompt and reply, every byte counted as a token).
const c = json('cost.json')
const cm = c.models['openai/gpt-4.1-mini'], cs = c.models['anthropic/claude-sonnet-4.5']
blocks.cost = `at most $${cm.usdPerDraftAtMost} with gpt-4.1-mini (at least ${cm.draftsPerDollarAtLeast} drafts for $1) or $${cs.usdPerDraftAtMost} with Claude Sonnet 4.5, at OpenRouter's list prices of ${c.read} (\`node eval/cost.mjs\`).`
if (h) {
  const five = ['Arabic', 'Persian', 'Hindi', 'Thai', 'Hebrew']
  const g = five.reduce((n, k) => n + h.by[k].glozA, 0)
  const p = five.reduce((n, k) => n + h.by[k].plainA, 0)
  blocks.first = `**Gloz lets the executive who wears Even G2 all day read and answer every message without the phone, in their language, at their size.** In the Even Hub simulator, plain G2 text showed ${p} of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew; Gloz showed ${g}. Gloz won ${h.wins} of 10 scripts, and${t ? ` cut the median time from message seen to reply sent from ${t.plainMedian.toFixed(1)} s to ${t.glozMedian.toFixed(1)} s` : ''}.`
  blocks.heldout = read('heldout.md').trim()
}
if (t) blocks.time = read('time.md').trim()

// Every complaint an app can act on, with its result: measured wins first, then the rest as they stand.
const ORDER = ['beaten', 'matched', 'not beaten', 'different measure', 'not measured', 'needs a key', 'no number to beat', 'not built']
const rows = complaintRows().sort((a, b) => ORDER.indexOf(a.v) - ORDER.indexOf(b.v) || a.n - b.n)
blocks.wins = [
  '| What G2 owners asked for | What Gloz does | Gloz | Best elsewhere | Result |',
  '|---|---|---|---|---|',
  ...rows.map(r => `| "${r.q}" (${r.d}) | ${r.fix} | ${r.gloz} | ${r.best} | ${r.v === 'beaten' ? 'Gloz ahead' : r.v} |`),
].join('\n')

// The tests, counted as the runner counts them (each test( call in test/), with the log of every run.
const testFiles = readdirSync(new URL('../test/', import.meta.url)).filter(n => /\.test\.(m?js|ts)$/.test(n))
const testCount = testFiles.reduce((n, f) => n + (readFileSync(new URL(`../test/${f}`, import.meta.url), 'utf8').match(/^\s*test\(/gm) || []).length, 0)
blocks.tests = `${testCount} tests in ${testFiles.length} files, all run on every push: [pass log](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml)`

// Each page and the blocks it must hold; a block written inline (gen-i) stays on its line.
const PAGES = { 'README.md': ['first', 'heldout', 'time', 'wins', 'video', 'cost', 'tests'], 'SUBMISSION-CHECK.md': ['video'] }
let stale = false
for (const [file, want] of Object.entries(PAGES)) {
  const path = new URL(`../${file}`, import.meta.url)
  const before = readFileSync(path, 'utf8')
  let md = before
  for (const k of want) {
    const block = new RegExp(`(<!-- gen:${k} -->)[\\s\\S]*?(<!-- /gen -->)`)
    if (!block.test(md)) { console.log(`${file}: the gen:${k} marker is missing`); process.exit(1) }
    // A function, so a "$" in the text (prices) is never read as a pattern; a short value stays inline.
    const val = blocks[k]
    md = md.replace(new RegExp(`(<!-- gen:${k} -->)[\\s\\S]*?(<!-- /gen -->)`, 'g'), (_, a, b) => k !== 'first' && k !== 'tests' && (val.includes('\n') || val.length > 40) ? `${a}\n${val}\n${b}` : `${a}${val}${b}`)   // the README's first line stays one line
  }
  if (md !== before) { stale = true; if (!process.argv.includes('--check')) writeFileSync(path, md) }
}
if (process.argv.includes('--check')) {
  if (stale) { console.log('README.md or SUBMISSION-CHECK.md is out of date: run node scripts/readme.mjs'); process.exit(1) }
  console.log('README and SUBMISSION-CHECK numbers match eval/results')
} else console.log('blocks written:', Object.keys(blocks).join(', '))
