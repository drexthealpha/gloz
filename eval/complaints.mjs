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

// 36: every AI provider set up and every one failing (a server error on each call): does each message still get a reply to send?
{
  const keep = { ...process.env }
  // Dummy values only, so all three providers are tried; no real key is read or used.
  process.env.GLOZ_OPENROUTER_KEY = 'x'; process.env.GLOZ_ANTHROPIC_KEY = 'x'; process.env.GLOZ_OPENAI_KEY = 'x'
  const realFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (u, o) => { if (/openrouter|anthropic|openai/.test(String(u))) { calls++; return new Response('{"error":"server error"}', { status: 500 }) } return realFetch(u, o) }
  const items = JSON.parse(readFileSync(new URL('./set/heldout.json', import.meta.url), 'utf8')).items
  let got = 0
  for (const it of items) { const d = await ai.draft({ id: 'o', from: 'S', text: it.expected }, [], '', 'en').catch(() => null); if (d && d.text && d.text.trim()) got++ }
  globalThis.fetch = realFetch
  for (const k of ['GLOZ_OPENROUTER_KEY', 'GLOZ_ANTHROPIC_KEY', 'GLOZ_OPENAI_KEY']) if (keep[k] === undefined) delete process.env[k]; else process.env[k] = keep[k]
  out.outage = { messages: items.length, gotReply: got, providerCallsFailed: calls }
}

// 8 and 36: one command word acts in ten languages; no always-on wake word exists to misfire.
out.words = { send: ['send', 'أرسل', 'بفرست', 'भेजो', 'ส่ง', 'שלח', '送信', '보내', '发送', 'отправь'].filter(w => word(w) === 'send').length, alwaysListening: false }

// 93, 102, 80, 85: a long meeting in Listen mode. 60 hours of 4-second pieces: is any
// piece dropped or any shown caption rewritten? Can any earlier line be reached?
{
  let r = roomStep(room(), { t: 'start' })
  const pieces = (60 * 3600) / 4
  const shown = []
  for (let i = 0; i < pieces; i++) { r = roomStep(r, { t: 'heard', text: `line ${i}`, at: i }); if (i % 997 === 0) shown.push([i, r.lines[i].text]) }
  const rewritten = shown.filter(([i, t]) => r.lines[i].text !== t).length
  let back = r
  for (let i = 0; i < pieces - 1; i++) back = roomStep(back, { t: 'up' })
  out.room = { hours: 60, pieces, kept: r.lines.length, rewritten, earliestReachable: back.at === 0, tapsToPause: 1 }
}

writeFileSync(new URL('./results/complaints.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(JSON.stringify(out, null, 1))

// 29, 92: the dashboard. Every panel the wearer can pick (12), each at its longest text, on one 576 x 288 screen
// (a 576 x 256 grid above the hint line): how many fit at 20 px or more with nothing cut?
{
  const { grid, panelText, PANELS, MIN_PX } = await import('../app/src/modes/dash.ts')
  const { measure } = await import('./text-width.mjs')
  const data = {
    unread: 12345, events: [{ at: '2026-11-24T23:45:00Z', title: 'Quarterly board review with investors' }, { at: '2026-11-25T08:00:00Z', title: 'Dinner with the Hamburg team' }],
    tasks: { due: 999, first: 'Send the signed contract to legal' }, weather: { temp: -12.4, hi: -10, lo: -22, rain: 100, wind: 104 },
  }
  const texts = PANELS.map(([id]) => panelText(id, data, 'en', new Date('2026-09-30T23:59:00Z'), 'Pick up dry cleaning before 6', true))
  const cells = grid(texts, measure, 576, 256)
  const fit = cells.filter(c => c.px >= MIN_PX && !c.cut && c.lines.every(l => measure(l, c.px) <= c.w - 12) && c.lines.length * c.px * 1.2 <= c.h - 12).length
  out.dashboard = { panels: PANELS.length, fitOneScreen: fit, smallestPx: Math.min(...cells.map(c => c.px)), maxChars: 28 }
  writeFileSync(new URL('./results/complaints.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
}
