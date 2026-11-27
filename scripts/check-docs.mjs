// Every path, link and npm script the docs name must exist, so a reader never follows a dead pointer.
//   node scripts/check-docs.mjs [root]   (also in CI)
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DOCS = ['README.md', 'SUBMISSION-CHECK.md', 'SUBMIT.md', 'app/README.md', 'docs/BEYOND-MESSAGES.md']

export function missing(root) {
  const json = p => { try { return JSON.parse(readFileSync(join(root, p), 'utf8')) } catch { return {} } }
  const scripts = new Set([...Object.keys(json('package.json').scripts || {}), ...Object.keys(json('app/package.json').scripts || {})])
  const there = (base, p) => existsSync(resolve(base, p)) || existsSync(join(root, p))
  const out = []
  for (const doc of DOCS) {
    if (!existsSync(join(root, doc))) continue
    const t = readFileSync(join(root, doc), 'utf8'), base = dirname(join(root, doc))
    for (const [, l] of t.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(l)) continue
      if (!there(base, decodeURIComponent(l.split('#')[0]))) out.push(`${doc}: link ${l}`)
    }
    for (const [, p] of t.matchAll(/`([\w./-]+\.(?:mjs|ts|json|md))`/g)) if (p.includes('/') && !there(base, p)) out.push(`${doc}: path ${p}`)
    for (const [, s] of t.matchAll(/npm (?:--prefix \w+ )?run ([\w:-]+)/g)) if (!scripts.has(s)) out.push(`${doc}: npm run ${s}`)
  }
  return out
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.argv[2] || fileURLToPath(new URL('..', import.meta.url))
  const out = missing(root)
  for (const m of out) console.log(m)
  if (out.length) { console.log(`${out.length} doc reference(s) do not resolve`); process.exit(1) }
  console.log(`every link, path and npm script in ${DOCS.length} docs resolves`)
}
