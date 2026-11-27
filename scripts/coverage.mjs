// Test coverage as a result anyone can rerun, so the README shows it without a hand-typed number.
//   npm run test:coverage > coverage.log; node scripts/coverage.mjs coverage.log          writes eval/results/coverage.json
//   node scripts/coverage.mjs --check coverage.log   fails if the run is over 1 point off the committed numbers
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const log = process.argv.slice(2).find(a => !a.startsWith('--'))
const all = readFileSync(log, 'utf8').split('\n').find(l => /^\W*all files\s*\|/.test(l))
if (!all) { console.log(`${log}: no "all files" coverage line`); process.exit(1) }
const [line, branch, funcs] = all.split('|').slice(1, 4).map(Number)
const now = { line, branch, funcs }
const F = new URL('../eval/results/coverage.json', import.meta.url)
if (process.argv.includes('--check')) {
  const was = JSON.parse(readFileSync(F, 'utf8'))
  const off = Object.keys(now).filter(k => Math.abs(now[k] - was[k]) > 1)
  for (const k of Object.keys(now)) console.log(`${off.includes(k) ? 'OFF ' : 'ok  '} ${k} coverage ${now[k]}% (committed ${was[k]}%)`)
  if (off.length) { console.log('coverage moved: run the tests with coverage and node scripts/coverage.mjs, then commit eval/results/coverage.json'); process.exit(1) }
} else {
  // The commit this run measured, written into its result.
  let commit = null
  try { commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim() } catch {}
  writeFileSync(F, JSON.stringify({ commit, ...now }, null, 1) + '\n')
  console.log(now)
}
