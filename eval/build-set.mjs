// Builds the locked evaluation set from Tatoeba sentence exports.
// Run once, before any evaluation run; the output is committed and never edited.
//   node eval/build-set.mjs <folder with ara.tsv, pes.tsv, ...>
// Source: https://downloads.tatoeba.org/exports/per_language/<lang>/<lang>_sentences.tsv.bz2
// Licence of the sentences: CC BY 2.0 FR (https://tatoeba.org/en/terms_of_use).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const LANGS = [
  ['ara', 'Arabic'], ['pes', 'Persian'], ['hin', 'Hindi'], ['tha', 'Thai'], ['heb', 'Hebrew'],
  ['jpn', 'Japanese'], ['kor', 'Korean'], ['cmn', 'Chinese'], ['rus', 'Russian'], ['eng', 'English'],
]
const PER_LANG_TEST = 20
const PER_LANG_DEV = 5
const SEED = 20261123

// Small deterministic generator (mulberry32) so the draw can be repeated.
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const dir = process.argv[2]
if (!dir) { console.error('usage: node eval/build-set.mjs <tatoeba folder>'); process.exit(1) }

const test = []
const dev = []
for (const [code, name] of LANGS) {
  const rows = readFileSync(join(dir, `${code}.tsv`), 'utf8').split('\n')
    .map(l => l.split('\t'))
    .filter(r => r.length >= 3)
    .map(([id, , text]) => ({ id: Number(id), text: text.trim() }))
    // Chat-length messages: 20 to 120 characters, no tabs or line breaks.
    .filter(r => [...r.text].length >= 20 && [...r.text].length <= 120)
    .sort((a, b) => a.id - b.id)
  const next = rng(SEED + code.charCodeAt(0) * 31 + code.charCodeAt(1))
  const picked = new Set()
  while (picked.size < PER_LANG_TEST + PER_LANG_DEV) picked.add(Math.floor(next() * rows.length))
  const list = [...picked].map(i => rows[i])
  list.slice(0, PER_LANG_DEV).forEach(r => dev.push({ lang: code, script: name, tatoeba_id: r.id, expected: r.text }))
  list.slice(PER_LANG_DEV).forEach(r => test.push({ lang: code, script: name, tatoeba_id: r.id, expected: r.text }))
  console.log(code, 'pool', rows.length)
}

mkdirSync(new URL('./set/', import.meta.url), { recursive: true })
const meta = { source: 'Tatoeba sentence exports, read 2026-11-23', licence: 'CC BY 2.0 FR', seed: SEED, rule: '20 to 120 characters' }
writeFileSync(new URL('./set/heldout.json', import.meta.url), JSON.stringify({ meta, items: test }, null, 1) + '\n')
writeFileSync(new URL('./set/dev.json', import.meta.url), JSON.stringify({ meta, items: dev }, null, 1) + '\n')
console.log('test', test.length, 'dev', dev.length)
