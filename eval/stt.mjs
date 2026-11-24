// Complaint 37: time from words spoken to caption in Listen mode, with Whisper on
// the Gloz server (needs `npm install --no-save @huggingface/transformers`).
//   node eval/stt.mjs <16 kHz mono 16-bit wav of speech>   writes eval/results/stt.json
// Worst case for a word: it waits for its 4-second piece to end, then for transcription.
import { readFileSync, writeFileSync } from 'node:fs'
import { transcribe } from '../server/stt.mjs'

const wav = readFileSync(process.argv[2])
const piece = wav.subarray(44, 44 + 4 * 32000)
const runs = []
let text = ''
for (let i = 0; i < 4; i++) { const r = await transcribe(Buffer.from(piece), 'en'); if (i) runs.push(r.ms); text = r.text }
runs.sort((a, b) => a - b)
const ms = runs[1]
const out = { engine: 'whisper-local (onnx-community/whisper-base, q8)', pieceS: 4, transcribeMs: ms, delayS: Number((4 + ms / 1000).toFixed(1)), text, machine: 'the build PC (8 GB laptop, CPU only)' }
writeFileSync(new URL('./results/stt.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(out)
