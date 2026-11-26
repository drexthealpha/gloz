// Turns one LibriSpeech chapter (free recordings of real people reading books, openslr.org/12) into the input
// eval/prompter-audio.mjs takes: one 16 kHz wav of the whole chapter and the time of every word.
// Word times: each utterance file's true start in the joined recording, plus Whisper's own word timestamps on
// that whole utterance when it hears the same number of words as the book's text; else spread by letters.
//   node eval/libri-prep.mjs <chapter folder> <out folder>
// Needs ffmpeg and the optional package @huggingface/transformers.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const [dir, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const RATE = 16000
const trans = readFileSync(join(dir, readdirSync(dir).find(f => f.endsWith('.trans.txt'))), 'utf8')
  .trim().split(/\r?\n/).map(l => { const i = l.indexOf(' '); return [l.slice(0, i), l.slice(i + 1).toLowerCase().split(/\s+/)] })
const { pipeline } = await import('@huggingface/transformers')
let asr = null
try { asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base_timestamped', { dtype: 'q8' }) } catch (e) { console.log('no word timestamps:', e.message) }

const parts = [], words = []
let at = 0, fromModel = 0, spread = 0
for (const [id, ws] of trans) {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', join(dir, id + '.flac'), '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], { maxBuffer: 1 << 28 })
  const pcm = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2)
  const secs = pcm.length / RATE
  let times = null
  if (asr) {
    const f = new Float32Array(pcm.length)
    for (let i = 0; i < f.length; i++) f[i] = pcm[i] / 32768
    const r = await asr(f, { language: 'en', task: 'transcribe', return_timestamps: 'word' })
    const ch = (r.chunks || []).filter(c => /[a-z0-9]/i.test(c.text))
    if (ch.length === ws.length) times = ch.map(c => c.timestamp[0])
  }
  if (times) fromModel += ws.length
  else {
    // Spread over the utterance by letters (a word starts when the letters before it have been read).
    const total = ws.reduce((s, w) => s + w.length + 1, 0)
    let c = 0
    times = ws.map(w => { const t = (c / total) * secs; c += w.length + 1; return t })
    spread += ws.length
  }
  ws.forEach((w, i) => words.push({ w, ms: Math.round((at + times[i]) * 1000) }))
  parts.push(Buffer.from(raw))
  at += secs
}
const data = Buffer.concat(parts)
const head = Buffer.alloc(44)
head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8); head.write('fmt ', 12)
head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(RATE, 24)
head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(data.length, 40)
writeFileSync(join(out, 'speech.wav'), Buffer.concat([head, data]))
writeFileSync(join(out, 'words.json'), JSON.stringify(words))
console.log({ words: words.length, seconds: Math.round(at), fromModel, spread })
