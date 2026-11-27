// Time from message seen to reply sent (eval/PROTOCOL.md, "Time", amendment 3).
// The drafts come from Gloz's real backend code; the messages are the held-out set.
//   node --env-file-if-exists=.env eval/time.mjs
//   node eval/time.mjs --check   speed and data budget: fails if the medians are over 10% worse than eval/results/time.json
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.mjs'
import * as ai from '../server/ai.mjs'

const items = JSON.parse(readFileSync(new URL('./set/heldout.json', import.meta.url), 'utf8')).items
const CPS = (238 / 60) * 5.7       // reading, characters a second (Brysbaert 2019, 238 wpm)
const SPEAK_WPM = 150               // speaking a reply aloud
const TAP = 0.2
const chars = s => [...s.replace(/\s+/g, '')].length
const words = s => /\s/.test(s.trim()) ? s.trim().split(/\s+/).length : chars(s) / 5.7

const queue = items.map((it, i) => ({ id: `t:${i}`, source: 'eval', chat: it.script, from: 'Sender', text: it.expected, at: Date.now() - (items.length - i) * 1000, ref: {} }))   // dated now, in order: the server forgets messages older than 7 days
const conn = { name: 'eval', async poll() { const q = queue.splice(0); return q }, async send() {}, async read() {} }
const app = createApp({ connectors: [conn], ai: { ready: ai.aiReady, draft: ai.draft, translate: ai.translate }, stt: { ready: async () => false, transcribe: async () => ({}) }, dataDir: mkdtempSync(join(tmpdir(), 'gloz-time-')) })
await new Promise(r => app.server.listen(0, r))
const base = `http://127.0.0.1:${app.server.address().port}`
const { token } = await (await fetch(base + '/pair', { method: 'POST', body: JSON.stringify({ code: app.pairCode() }) })).json()
await app.pollOnce()
const H = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
// Data each message costs the phone: every request and reply body, counted in bytes (UTF-8) as they cross the link.
const B = s => Buffer.byteLength(s || '')
async function post(path, body) { const q = JSON.stringify(body); const r = await fetch(base + path, { method: 'POST', headers: H, body: q }); const t = await r.text(); return { j: JSON.parse(t), bytes: B(q) + B(t) } }
const inboxBytes = B(await (await fetch(base + '/inbox?after=0&lang=en', { headers: H })).text()) / items.length

const rows = []
for (let i = 0; i < items.length; i++) {
  const it = items[i]
  const t0 = performance.now()
  const { j: d, bytes: draftBytes } = await post('/draft', { id: `t:${i}`, lang: 'en' })
  const draftS = (performance.now() - t0) / 1000
  const { bytes: sendBytes } = await post('/send', { key: `t:${i}#1`, id: `t:${i}`, text: d.text })
  const readMsg = chars(it.expected) / CPS
  const reply = d.text || ''
  // The draft card shows the meaning in the wearer's language when the reply is in another one.
  const readDraft = chars(d.gloss || reply) / CPS
  const plain = readMsg + (words(reply) / SPEAK_WPM) * 60 + 0 + TAP
  const gloz = readMsg + Math.max(0, draftS - readMsg) + readDraft + TAP
  // Words sent per minute of the wearer's time, with no voice: the silent reply rate.
  const wpm = words(reply) / (gloz / 60)
  rows.push({ lang: it.lang, id: it.tatoeba_id, by: d.by, draftS: +draftS.toFixed(3), plain: +plain.toFixed(2), gloz: +gloz.toFixed(2), wpm: +wpm.toFixed(1), bytes: Math.round(inboxBytes + draftBytes + sendBytes) })
}
app.server.close()
const med = a => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 }
const by = [...new Set(rows.map(r => r.by))].join(', ')
const out = { drafter: by, bytesMedian: med(rows.map(r => r.bytes)), draftMedianS: med(rows.map(r => r.draftS)), wpmMedian: med(rows.map(r => r.wpm)), plainMedian: med(rows.map(r => r.plain)), glozMedian: med(rows.map(r => r.gloz)), glozFaster: rows.filter(r => r.gloz < r.plain).length, n: rows.length, rows }
// The budget: a slower or heavier build is a bug. Compared with the committed run, same drafter.
if (process.argv.includes('--check')) {
  const was = JSON.parse(readFileSync(new URL('./results/time.json', import.meta.url), 'utf8'))
  if (was.drafter !== out.drafter) { console.log(`time budget: committed run drafted by ${was.drafter}, this one by ${out.drafter}: run without a key`); process.exit(1) }
  const over = [
    ['median draft time', out.draftMedianS, Math.max(was.draftMedianS * 1.1, was.draftMedianS + 0.05), 's'],
    ['median time, message seen to reply sent', out.glozMedian, was.glozMedian * 1.1, 's'],
    ['median data per message', out.bytesMedian, was.bytesMedian * 1.1, 'bytes'],
  ]
  for (const [what, now, max, unit] of over) console.log(`${now <= max ? 'ok  ' : 'OVER'} ${what}: ${+now.toFixed(3)} ${unit} (budget ${+max.toFixed(3)})`)
  process.exit(over.every(([, now, max]) => now <= max) ? 0 : 1)
}
mkdirSync(new URL('./results/', import.meta.url), { recursive: true })
writeFileSync(new URL('./results/time.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
const md = `| Arm | Modelled median seconds, message seen to reply sent |\n|---|---|\n| Plain G2 text, reply spoken in full | ${out.plainMedian.toFixed(1)} |\n| Gloz, draft read, one tap | ${out.glozMedian.toFixed(1)} |\n\nGloz faster on ${out.glozFaster} of ${out.n} messages. Silent reply rate with Gloz: ${out.wpmMedian.toFixed(0)} words a minute (median). Data per message, the message, its draft and the send: ${(out.bytesMedian / 1024).toFixed(1)} KB (median). Drafts by: ${by}. Protocol: eval/PROTOCOL.md (Time, amendment 3).\n`
writeFileSync(new URL('./results/time.md', import.meta.url), md)
console.log(md)
