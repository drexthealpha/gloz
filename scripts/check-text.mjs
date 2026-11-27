// Fails when public text has an em dash or a banned word.
// Public text: every Markdown file, the HTML pages, and the strings the app shows.
//   node scripts/check-text.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const SKIP = new Set(['node_modules', '.git', 'dist', 'dist-demo', 'out', 'results', 'set', 'data', '.claude'])
const EXT = /\.(md|html|ts|mjs|json|txt|yml)$/

import { createHash } from 'node:crypto'
import { NAME_HASHES, NAME_WORDS, SALES } from './banned.mjs'
import { ignored } from './ignore.mjs'
const sha = s => createHash('sha256').update(s).digest('hex')

function* files(dir) {
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue
    const p = join(dir, f)
    if (statSync(p).isDirectory()) yield* files(p)
    else if (EXT.test(f)) yield p
  }
}

let bad = 0, letThrough = 0
for (const p of files(ROOT)) {
  const rel = relative(ROOT, p).replace(/\\/g, '/')
  if (rel === 'scripts/check-text.mjs' || rel === 'scripts/banned.mjs' || rel.endsWith('package-lock.json')) continue
  const text = readFileSync(p, 'utf8')
  let fenced = false
  text.split('\n').forEach((line, i) => {
    if (line.trim().startsWith('```')) fenced = !fenced
    // <!-- check-text: ignore-line --> on a line lets that one line through, and is counted below.
    if (ignored(line, 'text')) { letThrough++; return }
    if (line.includes('—')) { console.log(`${rel}:${i + 1}: em dash`); bad++ }
    // The official page copied word for word in PLAN.md sits in a fenced block;
    // its words are the organisers', so only the dash rule applies there.
    if (fenced && rel === 'PLAN.md') return
    const low = line.toLowerCase()
    for (const w of SALES) {
      const re = new RegExp(`(^|[^a-z])${w.replace(/[-]/g, '\\-')}([^a-z]|$)`)
      if (re.test(low)) { console.log(`${rel}:${i + 1}: banned word "${w}"`); bad++ }
    }
    // Names are matched by hash: every run of 1 to NAME_WORDS words, letters and hyphens only.
    const ws = low.split(/[^a-z-]+/).filter(Boolean)
    for (let a = 0; a < ws.length; a++) for (let n = 1; n <= NAME_WORDS && a + n <= ws.length; n++) {
      if (NAME_HASHES.has(sha(ws.slice(a, a + n).join(' ')))) { console.log(`${rel}:${i + 1}: a banned name`); bad++ }
    }
  })
}
if (bad) { console.log(`${bad} problem(s) in public text`); process.exit(1) }
console.log(`public text: no em dashes, no banned words${letThrough ? ` (${letThrough} line(s) marked ignore-line)` : ''}`)
