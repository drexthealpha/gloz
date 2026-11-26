// Teleprompter on audio: the same steps and scoring as eval/prompter.mjs, but the words come from a speech
// engine listening to a recording of the script. Every 1.5 s the last 3 s of audio go to Whisper base (the
// model the Gloz server runs, onnx-community/whisper-base, q8); its words go to Gloz's aligner; a hit is the
// aligner naming exactly the last word spoken by then, read from the recording's own word timings.
//   node eval/prompter-audio.mjs <speech.wav> <words.json> <voice name>
// speech.wav: 16 kHz, 16-bit mono; words.json: [{ w, ms }] for every word, in order (the voice's own timings).
// Needs the optional package @huggingface/transformers (npm i --no-save @huggingface/transformers).
import { readFileSync, writeFileSync } from 'node:fs'
import { align } from '../server/modes/prompter.mjs'

const [wavPath, wordsPath, voice = 'unknown voice'] = process.argv.slice(2)
const wav = readFileSync(wavPath)
const dataAt = wav.indexOf('data') + 8
const pcm = new Int16Array(wav.buffer, wav.byteOffset + dataAt, Math.floor((wav.length - dataAt) / 2))
const words = JSON.parse(readFileSync(wordsPath, 'utf8').replace(/^﻿/, ''))
const script = words.map(x => x.w)
const RATE = 16000
const { pipeline } = await import('@huggingface/transformers')
const asr = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', { dtype: 'q8' })

let at = 0, hits = 0, near = 0, chunks = 0
const end = pcm.length / RATE
for (let t = 1.5; t <= end + 0.01; t += 1.5) {
  const from = Math.max(0, Math.round((t - 3) * RATE)), to = Math.min(pcm.length, Math.round(t * RATE))
  const f = new Float32Array(to - from)
  for (let i = 0; i < f.length; i++) f[i] = pcm[from + i] / 32768
  const heard = String((await asr(f, { language: 'en', task: 'transcribe' })).text || '').split(/\s+/).filter(Boolean)
  // The last word spoken by time t, from the voice's own timings.
  let said = -1
  for (let i = 0; i < words.length; i++) if (words[i].ms / 1000 <= t) said = i
  if (said < 0 || !heard.length) continue
  const lo = Math.max(0, at - 8)
  const k = align(script.slice(lo, at + 80), heard, at - lo)
  if (k !== null) at = lo + k
  chunks++
  if (at - 1 === said) hits++
  if (Math.abs(at - 1 - said) <= 1) near++
}
const out = { input: `recorded speech: ${voice}, ${script.length} words, ${end.toFixed(0)} s`, engine: 'Whisper base (onnx-community/whisper-base, q8)', updates: chunks, exact: hits / chunks, within1: near / chunks }
writeFileSync(new URL('./results/prompter-audio.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(out)
