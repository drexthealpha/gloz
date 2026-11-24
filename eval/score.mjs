// Recomputes every count in the results tables from the raw rows, so each
// number in the README comes from a command anyone can run.
//   node eval/score.mjs          print the tables
//   node eval/score.mjs --check  fail if a committed table does not match its rows
import { readFileSync, existsSync } from 'node:fs'

const R = n => new URL(`./results/${n}`, import.meta.url)
const median = a => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 }
let bad = 0

if (existsSync(R('heldout.json'))) {
  const j = JSON.parse(readFileSync(R('heldout.json'), 'utf8'))
  const by = {}
  for (const r of j.results) {
    const s = (by[r.script] ??= { plain: [], gloz: [], plainA: 0, glozA: 0, n: 0 })
    s.n++; s.plain.push(r.plain.survive); s.gloz.push(r.gloz.survive)
    if (r.plain.cerA <= j.pass) s.plainA++
    if (r.gloz.cerA <= j.pass) s.glozA++
  }
  let wins = 0
  for (const [k, s] of Object.entries(by)) {
    const pm = median(s.plain), gm = median(s.gloz)
    if (gm > pm) wins++
    console.log(`${k}: plain ${pm} px, gloz ${gm} px, sharp ${s.plainA}/${s.n} vs ${s.glozA}/${s.n}`)
    const line = readFileSync(R('heldout.md'), 'utf8').split('\n').find(l => l.startsWith(`| ${k} |`)) || ''
    const want = `${s.plainA}/${s.n} | ${s.glozA}/${s.n} |`
    if (!line.includes(want)) { console.log(`  table row for ${k} does not match`); bad++ }
  }
  console.log(`scripts won: ${wins} of ${Object.keys(by).length}`)
  if (wins !== j.wins) { console.log('wins in the file do not match the rows'); bad++ }
}

if (existsSync(R('time.json'))) {
  const t = JSON.parse(readFileSync(R('time.json'), 'utf8'))
  const pm = median(t.rows.map(r => r.plain)), gm = median(t.rows.map(r => r.gloz))
  const faster = t.rows.filter(r => r.gloz < r.plain).length
  console.log(`time: plain ${pm} s, gloz ${gm} s, gloz faster on ${faster} of ${t.rows.length}`)
  if (pm !== t.plainMedian || gm !== t.glozMedian || faster !== t.glozFaster) { console.log('time file does not match its rows'); bad++ }
}

if (process.argv.includes('--check') && bad) process.exit(1)
