// Each living doc says who owns it and when it was last read through: "Owner: <name> · reviewed YYYY-MM-DD".
// Warn-only: a doc not reviewed for 90 days, or with no such line, prints a warning in CI and fails nothing.
//   node scripts/reviewed.mjs
import { readFileSync } from 'node:fs'

export const DOCS = ['README.md', 'SUBMISSION-CHECK.md', 'PLAN.md', 'app/README.md', 'eval/PROTOCOL.md']
const DAY = 864e5
export function stale(text, now = Date.now()) {
  const m = text.match(/Owner: [^\n]*· reviewed (\d{4}-\d{2}-\d{2})/)
  if (!m) return 'no owner and reviewed-date line'
  const days = Math.floor((now - Date.parse(m[1])) / DAY)
  return days > 90 ? `last reviewed ${m[1]}, ${days} days ago` : ''
}
import { fileURLToPath } from 'node:url'
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  let n = 0
  for (const d of DOCS) {
    const why = stale(readFileSync(new URL(`../${d}`, import.meta.url), 'utf8'))
    if (why) { n++; console.log(`::warning file=${d}::${d}: ${why}`) }
  }
  console.log(n ? `${n} doc(s) to review (warning only)` : `${DOCS.length} docs reviewed within 90 days`)
}
