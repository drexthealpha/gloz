// Teleprompter on the server: the script from Notion or Google Docs (same keys and documents as Notes;
// with GLOZ_SAMPLE=1 or no account, a sample script), and following the wearer's voice: a few seconds of
// speech are turned into words by the server's speech engine, then lined up with the script.
import { transcribe } from '../stt.mjs'
import { docsSource, listDocs, readDoc, setupLine } from './notes.mjs'
import { samplePrompter } from '../../app/src/modes/prompter.ts'

export const norm = w => String(w).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '')

function lev(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = row
  }
  return prev[b.length]
}

// Same word 2, a near spelling (one letter off, two in long words) 1, else -1.
function sim(a, b) {
  if (!a || !b) return -1
  if (a === b) return 2
  const n = Math.max(a.length, b.length)
  return n >= 4 && Math.abs(a.length - b.length) <= 2 && lev(a, b) <= (n >= 7 ? 2 : 1) ? 1 : -1
}

// Where the wearer is in the script after saying `heard`: the index of the next word to read,
// or null when the words heard do not match the script well enough to move.
// `script` is the part of the script around the place, `cur` the place inside it.
// Local alignment (Smith and Waterman, 1981) of the words heard against the script words.
export function align(script, heard, cur = 0) {
  const S = script.map(norm)
  const H = heard.map(norm).filter(Boolean)
  const n = H.length, m = S.length
  if (!n || !m) return null
  let prev = new Float64Array(m + 1)
  let best = null
  for (let i = 1; i <= n; i++) {
    const row = new Float64Array(m + 1)
    for (let j = 1; j <= m; j++) {
      const v = Math.max(0, prev[j - 1] + sim(H[i - 1], S[j - 1]), prev[j] - 1, row[j - 1] - 1)
      row[j] = v
      if (v < 3) continue
      // The end of the words heard counts most; a place far from the last one counts less.
      const end = Math.min(m - 1, j - 1 + (n - i))
      const eff = v - 0.6 * (n - i) - 0.04 * Math.abs(end - cur)
      if (!best || eff > best.eff) best = { eff, end }
    }
    prev = row
  }
  return best ? best.end + 1 : null
}

export async function handle(body, { env = process.env, stt = transcribe } = {}) {
  const a = body?.action
  if (a === 'follow') {
    if (!body.pcm) return { at: null }
    let r
    try { r = await stt(Buffer.from(String(body.pcm), 'base64'), body.lang || 'en') } catch { return { error: 'No speech engine on the server' } }
    const words = String(body.words ?? '').split(/\s+/).filter(Boolean)
    const heardWords = String(r.text ?? '').split(/\s+/).filter(Boolean)
    const k = align(words, heardWords, Number(body.at) || 0)
    return { at: k === null ? null : (Number(body.from) || 0) + k, heard: r.text ?? '', ms: r.ms }
  }
  if (docsSource(env) === 'sample') return samplePrompter(body)
  try {
    if (a === 'list') return await listDocs(env)
    if (a === 'read') return await readDoc(env, String(body.id ?? ''))
    return { error: 'unknown action' }
  } catch (e) {
    const line = setupLine(e)
    if (line) return { error: line }
    throw e
  }
}
