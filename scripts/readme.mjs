// Fills the generated blocks of README.md from eval/results, so every number
// on the page comes from a command anyone can run.
//   node scripts/readme.mjs          rewrite the blocks
//   node scripts/readme.mjs --check  fail if README.md differs from what the results say
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { complaintRows } from '../eval/rows.mjs'

const R = n => new URL(`../eval/results/${n}`, import.meta.url)
const read = n => existsSync(R(n)) ? readFileSync(R(n), 'utf8') : null
const json = n => existsSync(R(n)) ? JSON.parse(readFileSync(R(n), 'utf8')) : null

const blocks = {}
const h = json('heldout.json')
const t = json('time.json')
if (h) {
  const five = ['Arabic', 'Persian', 'Hindi', 'Thai', 'Hebrew']
  const g = five.reduce((n, k) => n + h.by[k].glozA, 0)
  const p = five.reduce((n, k) => n + h.by[k].plainA, 0)
  blocks.first = `**Gloz lets the executive who wears Even G2 all day read and answer every message without the phone, in their language, at their size.** In the Even Hub simulator, plain G2 text showed ${p} of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew; Gloz showed ${g}. Gloz won ${h.wins} of 10 scripts, and${t ? ` cut the median time from message seen to reply sent from ${t.plainMedian.toFixed(1)} s to ${t.glozMedian.toFixed(1)} s` : ''}.`
  blocks.heldout = read('heldout.md').trim()
}
if (t) blocks.time = read('time.md').trim()

const rows = complaintRows()
const order = ['beaten', 'matched', 'no number to beat', 'different measure', 'not beaten', 'not measured yet', 'not built', 'outside the job']
rows.sort((a, b) => order.indexOf(a.v) - order.indexOf(b.v) || a.n - b.n)
const count = v => rows.filter(r => r.v === v).length
blocks.complaints = [
  `Of the ${rows.length} complaints an app can answer in full or in part: ${order.filter(count).map(v => `${count(v)} ${v}`).join(', ')}.`,
  '',
  '| # | What a G2 owner wrote | What Gloz does | Gloz | Best today | Result |',
  '|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.n} | "${r.q}" (${r.d}) | ${r.fix} | ${r.gloz} | ${r.best} | ${r.v} |`),
].join('\n')

const path = new URL('../README.md', import.meta.url)
let md = readFileSync(path, 'utf8')
for (const [k, v] of Object.entries(blocks)) {
  // A function, so a "$" in the text (prices) is never read as a pattern.
  md = md.replace(new RegExp(`(<!-- gen:${k} -->)[\\s\\S]*?(<!-- /gen -->)`), (_, a, b) => `${a}\n${v}\n${b}`)
}
if (process.argv.includes('--check')) {
  if (md !== readFileSync(path, 'utf8')) { console.log('README.md is out of date: run node scripts/readme.mjs'); process.exit(1) }
  console.log('README numbers match eval/results')
} else {
  writeFileSync(path, md)
  console.log('README.md blocks written:', Object.keys(blocks).join(', '))
}
