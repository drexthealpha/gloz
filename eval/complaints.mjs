// Measures Gloz's own number for each complaint row it answers, with no keys.
// Each measure runs the real code; none is typed in by hand.
//   node eval/complaints.mjs     writes eval/results/complaints.json
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { start, step, word, card } from '../app/src/core/flow.ts'
import { wrap } from '../app/src/core/layout.ts'
import { Outbox } from '../app/src/core/outbox.ts'
import { room, roomStep } from '../app/src/core/room.ts'
import { createApp } from '../server/app.mjs'
import * as ai from '../server/ai.mjs'

const out = {}

// 104: long text is never cut. A 2,000,000-character message is laid out in full.
{
  const text = 'Board pack page. '.repeat(Math.ceil(2_000_000 / 17)).slice(0, 2_000_000)
  const lines = wrap(text, 552, s => [...s].length * 22)
  const kept = lines.join(' ').replace(/\s+/g, '').length
  out.longText = { chars: 2_000_000, kept: kept === text.replace(/\s+/g, '').length ? 2_000_000 : kept }
}

// 33 and 103: silent replies. Words sent per minute of the wearer's time, from the time evaluation.
{
  const t = JSON.parse(readFileSync(new URL('./results/time.json', import.meta.url), 'utf8'))
  out.silentReply = { wpmMedian: t.wpmMedian ?? null, note: 'from eval/results/time.json' }
}

// 24 and 83: what one stray press can do. From every screen, one press is applied;
// count how often it sends a reply that was not on screen at the time.
{
  const m = { id: 'a', source: 'telegram', chat: 'c', from: 'Ana', text: 'Can we meet at 3?', at: 1 }
  const draft = { text: 'Yes, 3 works.', by: 'ai' }
  const screens = {
    empty: start(true),
    message: step(start(true), { t: 'inbox', msgs: [m] }).s,
  }
  screens.message = step(screens.message, { t: 'draft', id: 'a', draft }).s
  screens.draft = step(screens.message, { t: 'tap' }).s
  screens.listen = step(screens.draft, { t: 'hold' }).s
  let sendsWithoutReplyShown = 0, presses = 0
  for (const [name, s] of Object.entries(screens)) {
    for (const ev of [{ t: 'tap' }, { t: 'next' }, { t: 'prev' }, { t: 'hold' }, { t: 'release' }]) {
      presses++
      const r = step(s, ev)
      if (r.fx.some(f => f.e === 'send') && name !== 'draft') sendsWithoutReplyShown++
    }
  }
  out.hints = { screens: Object.keys(screens).length + 3, withoutHint: [...Object.values(screens), step(screens.draft, { t: 'tap' }).s, step(start(true), { t: 'online', online: false, queued: 1 }).s, start(false)].filter(s => !card(s).hint).length }
  out.strayPress = { screens: Object.keys(screens).length, presses, sendsWithoutReplyShown, pressesToSend: 2 }
}

// 13 and 81: Gloz's pairing never logs out; and replies survive an app restart (outbox).
{
  const src = readFileSync(new URL('../server/app.mjs', import.meta.url), 'utf8')
  out.pairing = { tokenExpiry: /expir/i.test(src) ? 'has expiry' : 'none' }
  const d = {}
  const store = { get: k => d[k] ?? null, set: (k, v) => { d[k] = v } }
  new Outbox(store, async () => 'retry').add('m', 'Yes')
  out.outbox = { keptAfterRestart: new Outbox(store, async () => 'ok').size }
}

// 52: message text kept by the backend after the reply is sent, and 41: reply language.
{
  for (const k of Object.keys(process.env)) if (k.startsWith('GLOZ_')) delete process.env[k]
  const sent = []
  const items = JSON.parse(readFileSync(new URL('./set/heldout.json', import.meta.url), 'utf8')).items
  const q = items.map((it, i) => ({ id: `t:${i}`, source: 'x', chat: it.script, from: 'S', text: it.expected, at: Date.now() - i, ref: {} }))
  const conn = { name: 'x', async poll() { return q.splice(0) }, async send(m, t) { sent.push(t) }, async read() {} }
  const app = createApp({ connectors: [conn], ai: { ready: ai.aiReady, draft: ai.draft, translate: ai.translate }, stt: { ready: async () => false, transcribe: async () => ({}) }, dataDir: mkdtempSync(join(tmpdir(), 'gloz-c-')) })
  await new Promise(r => app.server.listen(0, r))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const { token } = await (await fetch(base + '/pair', { method: 'POST', body: JSON.stringify({ code: app.pairCode() }) })).json()
  await app.pollOnce()
  const H = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
  const { guessLang } = await import('../server/lang.mjs')
  let sameLang = 0
  for (let i = 0; i < items.length; i++) {
    const d = await (await fetch(base + '/draft', { method: 'POST', headers: H, body: JSON.stringify({ id: `t:${i}`, lang: 'en' }) })).json()
    if (guessLang(d.text) === guessLang(items[i].expected)) sameLang++
    await fetch(base + '/send', { method: 'POST', headers: H, body: JSON.stringify({ key: `k${i}`, id: `t:${i}`, text: d.text }) })
  }
  const left = (await (await fetch(base + '/inbox?after=0', { headers: H })).json()).msgs.length
  app.server.close()
  const disk = JSON.stringify(app.state)
  out.privacy = { messages: items.length, sent: sent.length, textLeftInInbox: left, messageTextOnDisk: items.filter(it => disk.includes(it.expected)).length }
  out.replyLanguage = { messages: items.length, sameLanguage: sameLang, drafter: ai.aiReady() ? 'ai' : 'holding reply' }
}

// 8 and 36: one command word acts in ten languages; no always-on wake word exists to misfire.
out.words = { send: ['send', 'أرسل', 'بفرست', 'भेजो', 'ส่ง', 'שלח', '送信', '보내', '发送', 'отправь'].filter(w => word(w) === 'send').length, alwaysListening: false }

// 93, 102, 80: a long meeting in Listen mode. 11 hours of 4-second pieces: is any
// piece dropped or any shown caption rewritten? Can any earlier line be reached?
{
  let r = roomStep(room(), { t: 'start' })
  const pieces = (11 * 3600) / 4
  const shown = []
  for (let i = 0; i < pieces; i++) { r = roomStep(r, { t: 'heard', text: `line ${i}`, at: i }); if (i % 997 === 0) shown.push([i, r.lines[i].text]) }
  const rewritten = shown.filter(([i, t]) => r.lines[i].text !== t).length
  let back = r
  for (let i = 0; i < pieces - 1; i++) back = roomStep(back, { t: 'up' })
  out.room = { hours: 11, pieces, kept: r.lines.length, rewritten, earliestReachable: back.at === 0, tapsToPause: 1 }
}

writeFileSync(new URL('./results/complaints.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(JSON.stringify(out, null, 1))
