// Teleprompter: word position accuracy of Gloz's aligner on simulated speech recognition output.
// Same measure as the TalTech reading tutor (exact-word position accuracy), but on text, not audio:
// a reader goes through the script; every 1.5 s the words recognised in the last 3 s are given to
// the aligner, with recognition errors drawn from a fixed seed. A hit is the aligner naming exactly
// the last word the reader said. Delay is not measured here: it depends on the speech engine.
//   node eval/prompter.mjs
import { align } from '../server/modes/prompter.mjs'
import { samplePrompter } from '../app/src/modes/prompter.ts'
import { sampleReader } from '../app/src/modes/reader.ts'

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

export const ERRORS = { sub: 0.10, del: 0.06, ins: 0.04, cutLast: 0.15, reread: 0.04, skip: 0.03, pause: 0.10 }

export function simulate({ seed = 1, passes = 5, errors = ERRORS } = {}) {
  const r = rng(seed)
  const script = [samplePrompter({ action: 'read', id: 'sample-script' }).text, sampleReader({ action: 'read', id: 'sample-reader' }).text].join(' ').split(/\s+/).filter(Boolean)
  const vocab = [...new Set(script.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean))]
  const fillers = ['uh', 'um', 'the', 'and', 'so']
  const garble = w => {
    if (r() < 0.5 && w.length >= 4) { const i = 1 + Math.floor(r() * (w.length - 1)); return w.slice(0, i) + 'aeiou'[Math.floor(r() * 5)] + w.slice(i + 1) }
    return vocab[Math.floor(r() * vocab.length)]
  }
  let hits = 0, near = 0, chunks = 0
  for (let pass = 0; pass < passes; pass++) {
    const slots = []          // word indices said in each 1.5 s slot
    let t = -1                // last word said
    let at = 0                // the aligner's place: next word to read
    while (t < script.length - 1) {
      const said = []
      if (r() >= errors.pause) {
        if (r() < errors.reread && t > 3) t -= 3                        // the reader starts a phrase again
        if (r() < errors.skip) t = Math.min(script.length - 2, t + 2)   // the reader skips two words
        const k = 3 + (r() < 0.5 ? 1 : 0)                                // about 150 words a minute
        for (let j = 0; j < k && t < script.length - 1; j++) said.push(++t)
      }
      slots.push(said)
      if (!said.length) continue                                         // silence: nothing is sent
      // What the recogniser returns for the last 3 s (two slots).
      const heard = []
      const recent = [...(slots.at(-2) ?? []), ...said]
      recent.forEach((w, n) => {
        if (n === recent.length - 1 && r() < errors.cutLast) return       // last word cut at the edge
        const x = r()
        if (x < errors.del) return
        heard.push(x < errors.del + errors.sub ? garble(script[w]) : script[w])
        if (r() < errors.ins) heard.push(fillers[Math.floor(r() * fillers.length)])
      })
      const from = Math.max(0, at - 8)
      const k = align(script.slice(from, at + 80), heard, at - from)
      if (k !== null) at = from + k
      chunks++
      if (at - 1 === t) hits++
      if (Math.abs(at - 1 - t) <= 1) near++
    }
  }
  return { chunks, exact: hits / chunks, within1: near / chunks, words: script.length }
}

if (import.meta.main) {
  const s = simulate()
  console.log(`script ${s.words} words x 5 passes, ${s.chunks} updates, seed 1`)
  console.log(`exact word position: ${(s.exact * 100).toFixed(1)}%   within one word: ${(s.within1 * 100).toFixed(1)}%`)
  console.log('errors:', JSON.stringify(ERRORS))
  const { writeFileSync } = await import('node:fs')
  writeFileSync(new URL('./results/prompter.json', import.meta.url), JSON.stringify({ words: s.words, passes: 5, updates: s.chunks, seed: 1, exact: s.exact, within1: s.within1, errors: ERRORS, input: 'simulated recognizer text, not audio' }, null, 1) + String.fromCharCode(10))
}
