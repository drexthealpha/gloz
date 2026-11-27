// Hand-written numbers bound to their source: each claim in eval/claims.json says where a number is written
// and where it comes from; this fails if they differ.   node scripts/claims.mjs
import { readFileSync } from 'node:fs'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
// "five" is 5, and "2,000,000" in prose is 2_000_000 in code.
const norm = v => { const w = WORDS.indexOf(String(v).toLowerCase()); return w >= 0 ? String(w) : String(v).replace(/[,_](?=\d{3}\b|\d{3}[,_])/g, '') }
export function check(claims, read) {
  const bad = []
  for (const c of claims) {
    const get = s => { const m = read(s.file)?.match(new RegExp(s.regex)); return m ? norm(m[1]) : null }
    const a = get(c.in), b = get(c.from)
    if (a == null) bad.push(`${c.in.file}: no "${c.in.regex}" (${c.what})`)
    else if (b == null) bad.push(`${c.from.file}: no "${c.from.regex}" (${c.what})`)
    else if (a !== b) bad.push(`${c.in.file} says ${a} but ${c.from.file} has ${b} (${c.what})`)
  }
  return bad
}
import { fileURLToPath } from 'node:url'
const main = fileURLToPath(import.meta.url) === process.argv[1]
if (main) {
  const { claims } = JSON.parse(readFileSync(new URL('../eval/claims.json', import.meta.url), 'utf8'))
  const read = f => { try { return readFileSync(new URL(`../${f}`, import.meta.url), 'utf8') } catch { return null } }
  const bad = check(claims, read)
  for (const b of bad) console.log(b)
  if (bad.length) process.exit(1)
  console.log(`${claims.length} hand-written numbers match their source`)
}
