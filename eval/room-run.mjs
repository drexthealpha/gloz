// Listen to the room, run for real: the Gloz server with Whisper base on this machine gets 4-second pieces of a
// recording at the pace they are spoken (the recording loops), through POST /listen, the path the glasses use;
// every caption goes into the glasses' own room logic. Counts pieces sent, captioned and kept, over the hours run.
//   node eval/room-run.mjs <speech.wav> <hours>
// Needs the optional package @huggingface/transformers (npm i --no-save @huggingface/transformers).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { setPriority } from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.mjs'
import { transcribe, sttReady } from '../server/stt.mjs'
import { room, roomStep } from '../app/src/core/room.ts'

const [wavPath, hoursArg = '1'] = process.argv.slice(2)
try { setPriority(19) } catch {}   // lowest priority: the machine stays free for other work
const hours = Number(hoursArg)
const wav = readFileSync(wavPath)
const dataAt = wav.indexOf('data') + 8
const audio = wav.subarray(dataAt)
const PIECE = 16000 * 2 * 4     // 4 s of 16 kHz 16-bit mono, as the glasses send
const app = createApp({ connectors: [], ai: { ready: () => false, draft: async () => null, translate: async () => undefined }, stt: { ready: sttReady, transcribe }, dataDir: mkdtempSync(join(tmpdir(), 'gloz-room-')), log: () => {} })
await new Promise(r => app.server.listen(0, r))
const base = `http://127.0.0.1:${app.server.address().port}`
const { token } = await (await fetch(base + '/pair', { method: 'POST', body: JSON.stringify({ code: app.pairCode() }) })).json()

let r = roomStep(room(), { t: 'start' })
let sent = 0, captioned = 0, failed = 0, at = 0
const t0 = Date.now(), until = t0 + hours * 3600 * 1000
while (Date.now() < until) {
  const startPiece = Date.now()
  if (at + PIECE > audio.length) at = 0
  const piece = audio.subarray(at, at + PIECE); at += PIECE
  sent++
  try {
    const res = await fetch(base + '/listen?lang=en&spoken=en', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' }, body: piece })
    const j = await res.json()
    if (res.ok && j.text) { captioned++; r = roomStep(r, { t: 'heard', text: j.text, at: Date.now() }) } else if (!res.ok) failed++
  } catch { failed++ }
  // The next piece leaves 4 s after this one began, as the glasses' microphone would.
  await new Promise(ok => setTimeout(ok, Math.max(0, 4000 - (Date.now() - startPiece))))
}
app.server.close()
const out = { hours: Number(((Date.now() - t0) / 3600000).toFixed(2)), piecesSent: sent, captioned, failed, kept: r.lines.length, engine: 'Whisper base on the Gloz server', input: 'recorded speech, looped' }
writeFileSync(new URL('./results/room-run.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(out)
process.exit(0)
