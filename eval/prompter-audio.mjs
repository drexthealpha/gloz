// Teleprompter on audio: every 1.5 s the last 3 s of a recording go through the server's own follow step
// (server/modes/prompter.mjs handle(), with the server's speech engine, local Whisper base), with the same
// request the glasses send; a hit is the place shown being exactly the last word spoken by then, read from
// the recording's own word timings.
//   node eval/prompter-audio.mjs <speech.wav> <words.json> <voice name> [result name]
// speech.wav: 16 kHz, 16-bit mono; words.json: [{ w, ms }] for every word, in order.
// Needs the optional package @huggingface/transformers (npm i --no-save @huggingface/transformers).
import { readFileSync, writeFileSync } from 'node:fs'
import { handle } from '../server/modes/prompter.mjs'
import { transcribe } from '../server/stt.mjs'

const [wavPath, wordsPath, voice = 'unknown voice', name = 'prompter-audio'] = process.argv.slice(2)
const wav = readFileSync(wavPath)
const dataAt = wav.indexOf('data') + 8
const pcm = wav.subarray(dataAt, dataAt + Math.floor((wav.length - dataAt) / 2) * 2)
const words = JSON.parse(readFileSync(wordsPath, 'utf8').replace(/^﻿/, ''))
const script = words.map(x => x.w)
const RATE = 16000

let at = 0, hits = 0, near = 0, chunks = 0
const end = pcm.length / 2 / RATE
for (let t = 1.5; t <= end + 0.01; t += 1.5) {
  const lo = Math.max(0, Math.round((t - 3) * RATE)) * 2, hi = Math.min(pcm.length, Math.round(t * RATE) * 2)
  const from = Math.max(0, at - 8)
  const r = await handle({ action: 'follow', pcm: pcm.subarray(lo, hi).toString('base64'), lang: 'en', from, at: at - from, words: script.slice(from, at + 80).join(' ') }, { env: {}, stt: transcribe })
  // The last word spoken by time t, from the recording's own timings.
  let said = -1
  for (let i = 0; i < words.length; i++) if (words[i].ms / 1000 <= t) said = i
  if (said < 0 || !String(r.heard || '').trim()) continue
  if (typeof r.at === 'number') at = Math.min(script.length, Math.max(0, r.at))
  chunks++
  if (at - 1 === said) hits++
  if (Math.abs(at - 1 - said) <= 1) near++
}
const out = { input: `recorded speech: ${voice}, ${script.length} words, ${end.toFixed(0)} s`, engine: 'Whisper base with word times (onnx-community/whisper-base_timestamped, q8)', updates: chunks, exact: hits / chunks, within1: near / chunks }
writeFileSync(new URL(`./results/${name}.json`, import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(out)
