// Gloz backend. Holds every key; the glasses app holds only a pairing token.
// Routes (JSON unless noted):
//   GET  /health                      what is set up, no secrets
//   POST /pair      {code}            -> {token}  (the code is printed when the server starts)
//   GET  /inbox?after=N&lang=en&translate=1 -> {msgs, after}
//   POST /draft     {id, ask?, lang?} -> {text, gloss?, by}
//   POST /send      {key, id, text}   -> {ok} once per key, however often it is retried
//   POST /read      {id}
//   POST /unpair                      this phone's pairing ends at once
//   POST /stt       raw PCM body      -> {text, ms, engine}
import { createServer } from 'node:http'
import { randomBytes, createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { MODES } from './modes/index.mjs'
import { nextMeeting, lastChatOf, meetingMsg } from './meeting.mjs'
import { googleToken } from './modes/dash.mjs'

const sha = s => createHash('sha256').update(s).digest('hex')
// Compared in constant time (as hashes of equal length), so the time taken says nothing about the code.
const same = (a, b) => timingSafeEqual(Buffer.from(sha(String(a))), Buffer.from(sha(String(b))))

// A pairing in use never ends; one unused for 90 days ends, so a lost or retired device stops working.
export const IDLE_MS = 90 * 24 * 3600 * 1000
const DAY = 24 * 3600 * 1000

export function createApp({ connectors = [], ai, stt, dataDir, pollMs = 2000, log = console.log, now = Date.now, calendar }) {
  mkdirSync(dataDir, { recursive: true })
  const file = join(dataDir, 'state.json')
  let state
  try { state = JSON.parse(readFileSync(file, 'utf8')) } catch { state = {} }
  state.tokens ??= []
  // Older state kept bare hashes: they count as used now.
  state.tokens = state.tokens.map(t => typeof t === 'string' ? { h: t, used: now() } : t)
  state.sent ??= {}
  state.refs ??= {}
  state.pairCode ??= process.env.GLOZ_PAIR_CODE || String(randomInt(100000, 1000000))
  // Written to a temp file first, so a crash mid-write never loses the sent list.
  const save = () => { writeFileSync(file + '.tmp', JSON.stringify(state)); renameSync(file + '.tmp', file) }
  save()

  // Message text lives in memory only, and is dropped once the reply is sent: the message, its
  // translations and summary, and its line in the chat's recent messages all go (drop below).
  const msgs = new Map()
  const inbox = []          // [{seq, id}]
  // Wrong pairing codes, per client address: a client with five wrong codes in a row waits a minute;
  // five wrong codes from anyone retire the code, so it cannot be guessed (5 tries against 900,000).
  const pairLocks = new Map()   // address -> { wrong, until }
  let wrongTotal = 0
  const threads = new Map() // chat id -> last messages, for draft context
  let seq = 0
  const translations = new Map()   // `${id}|...` -> translation or summary
  let dirty = false   // state changed since it was last written
  const waiters = new Set()   // /inbox requests waiting for a message (long polling)

  // The one model call each message gets, started when it arrives (in the language the wearer last asked in),
  // so its reply is ready with it and the inbox can put the most pressing first.
  const early = new Map()   // id -> { lang, draft: Promise }
  let wearerLang = 'en'
  const draftFor = (m, lang) => {
    const thread = (threads.get(`${m.source}:${m.chat}`) || []).filter(t => t.id !== m.id)
    return ai.draft(m, thread, '', lang).then(d => noteAi(m.id, d)).catch(() => null)
  }
  const lastFrom = new Map()   // sender name -> { source, chat, ref, at }
  const arrivedAt = new Map()   // id -> when the server got it, until the glasses have it
  const book = { shown: [], delivered: [], sent: 0, asDrafted: 0 }
  const keep = (a, v) => { a.push(v); if (a.length > 500) a.shift() }
  const median = a => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const k = b.length >> 1; return b.length % 2 ? b[k] : Math.round((b[k - 1] + b[k]) / 2) }
  function add(m) {
    if (msgs.has(m.id) || state.refs[m.id]?.done) return
    msgs.set(m.id, m)
    state.refs[m.id] = { source: m.source, ref: m.ref, at: m.at }
    dirty = true
    inbox.push({ seq: ++seq, id: m.id })
    arrivedAt.set(m.id, now())
    for (const w of waiters) w()
    waiters.clear()
    const key = `${m.source}:${m.chat}`
    const t = threads.get(key) || []
    t.push({ id: m.id, from: m.from, text: m.text })
    threads.set(key, t.slice(-10))
    if (ai.ready() && !m.pre) early.set(m.id, { lang: wearerLang, draft: draftFor(m, wearerLang) })
    if (!m.meeting) lastFrom.set(m.from, { source: m.source, chat: m.chat, ref: m.ref, at: m.at })
  }

  // Every reply the AI wrote for a message, by hash: a sent text that matches one was written by the AI,
  // so the record says who wrote each reply without taking the phone's word for it.
  const aiWrote = new Map()
  const noteAi = (id, d) => { if (d?.by !== 'ai') return d; const set = aiWrote.get(id) || new Set(); for (const a of [d, ...(d.alts || [])]) if (a.text) set.add(sha(a.text)); aiWrote.set(id, set); return d }

  function drop(id) {
    const m = msgs.get(id)
    msgs.delete(id)
    early.delete(id)
    aiWrote.delete(id)
    for (const k of translations.keys()) if (k.startsWith(`${id}|`)) translations.delete(k)
    if (m) { const key = `${m.source}:${m.chat}`; const t = (threads.get(key) || []).filter(x => x.id !== id); if (t.length) threads.set(key, t); else threads.delete(key) }
    const i = inbox.findIndex(e => e.id === id)
    if (i >= 0) inbox.splice(i, 1)
  }

  // Refs older than 7 days are forgotten, and any message still unanswered by then is dropped.
  function prune() {
    const old = Date.now() - 7 * 864e5
    for (const [id, r] of Object.entries(state.refs)) if ((r.at || 0) < old) { delete state.refs[id]; drop(id); dirty = true }
  }
  const saveIfChanged = () => { if (dirty) { dirty = false; save() } }

  const health = { connectors: connectors.map(c => c.name), errors: {} }
  async function pollOnce() {
    for (const c of connectors) {
      if (c.listen && timer) continue   // pushed by its own listener while the server runs
      try { for (const m of await c.poll()) add(m); delete health.errors[c.name] } catch (e) { health.errors[c.name] = String(e.message || e) }
    }
    await meetingCard()
    prune()
    saveIfChanged()
  }
  // 10 minutes before a calendar meeting, its card goes in first: who and when, with "On my way." to send in the
  // chat where that person last wrote. Read only; checked once a minute.
  const readCalendar = calendar || (process.env.GLOZ_GOOGLE_REFRESH_TOKEN ? async url => { const r = await fetch(url, { headers: { authorization: `Bearer ${await googleToken(process.env)}` }, signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(`calendar ${r.status}`); return r.json() } : null)
  let meetCheckedAt = 0
  async function meetingCard() {
    if (!readCalendar || now() - meetCheckedAt < 60000) return
    meetCheckedAt = now()
    try {
      const ev = await nextMeeting(readCalendar, now())
      state.meets ??= {}
      if (!ev || state.meets[ev.id]) return
      const chat = lastChatOf(ev.who, lastFrom)
      if (!chat) return
      state.meets[ev.id] = now()
      dirty = true
      add(meetingMsg(ev, chat))
    } catch (e) { health.errors.calendar = String(e.message || e) }
  }
  let timer = null
  const startPolling = () => {
    if (timer) return
    pollOnce()
    timer = setInterval(pollOnce, pollMs)
    // A service that can push (Telegram long polling) delivers each message as it arrives.
    for (const c of connectors) if (c.listen) void c.listen(ms => { for (const m of ms) add(m); prune(); saveIfChanged() }, () => !timer).catch(e => { health.errors[c.name] = String(e.message || e) })
  }
  const stop = () => { clearInterval(timer); timer = null }

  const byName = Object.fromEntries(connectors.map(c => [c.name, c]))

  async function body(req, raw = false, max = 2_000_000) {
    const chunks = []
    let n = 0
    for await (const ch of req) { n += ch.length; if (n > max) throw Object.assign(new Error('too large'), { code: 413 }); chunks.push(ch) }
    const b = Buffer.concat(chunks)
    return raw ? b : (b.length ? JSON.parse(b.toString('utf8')) : {})
  }

  function authed(req) {
    const t = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!t) return false
    const h = sha(t)
    const live = state.tokens.filter(x => now() - x.used < IDLE_MS)
    if (live.length !== state.tokens.length) { state.tokens = live; save() }
    const mine = live.find(x => x.h === h)
    if (!mine) return false
    // Written at most once a day, so a busy device does not rewrite the file on every request.
    if (now() - mine.used > DAY) { mine.used = now(); save() }
    seen.set(h, now())
    return mine
  }

  // Use counts for the server owner, with no message text: devices seen in the last day and month.
  const seen = new Map()   // token hash -> last request, in memory
  const active = ms => state.tokens.filter(x => now() - Math.max(x.used, seen.get(x.h) || 0) < ms).length
  // AI drafts per device per day: a cap the owner sets (GLOZ_DRAFTS_PER_DAY, default 300), so no device runs up the AI bill.
  const drafts = new Map()   // token hash -> { day, n }
  function meter(dev) {
    const day = Math.floor(now() / DAY), d = drafts.get(dev.h)
    const n = d && d.day === day ? d.n + 1 : 1
    drafts.set(dev.h, { day, n })
    return n <= Number(process.env.GLOZ_DRAFTS_PER_DAY || 300)
  }

  // Each route answers [status, json]. /health and /pair are open; every other route needs a paired device.
  async function pair({ req }) {
    const { code } = await body(req)
    const who = req.socket.remoteAddress || '?'
    const lock = pairLocks.get(who) || { wrong: 0, until: 0 }
    if (Date.now() < lock.until) return [429, { error: 'too many wrong codes, try again in a minute' }]
    if (!same(String(code || '').trim(), state.pairCode)) {
      if (++lock.wrong >= 5) { lock.wrong = 0; lock.until = Date.now() + 60_000 }
      pairLocks.set(who, lock)
      if (++wrongTotal >= 5) {
        wrongTotal = 0
        if (!process.env.GLOZ_PAIR_CODE) { state.pairCode = String(randomInt(100000, 1000000)); save(); log(`Five wrong codes: new pairing code ${state.pairCode}`) }
      }
      return [403, { error: 'wrong code' }]
    }
    pairLocks.delete(who)
    wrongTotal = 0
    const token = randomBytes(24).toString('base64url')
    state.tokens.push({ h: sha(token), used: now() })
    // Each code pairs once; a new one is printed for the next device.
    if (!process.env.GLOZ_PAIR_CODE) { state.pairCode = String(randomInt(100000, 1000000)); log(`Pairing code for the next device: ${state.pairCode}`) }
    save()
    return [200, { token }]
  }

  // A message's translation and summary, made once and dropped with the message.
  async function cached(k, make) {
    if (!translations.has(k)) translations.set(k, await make().catch(() => undefined))
    return translations.get(k)
  }

  async function inboxSince({ url }) {
    const after = Number(url.searchParams.get('after') || 0)
    // ?wait=N (up to 25 s): with nothing new, the answer waits until a message comes, so it shows at once.
    const wait = Math.min(25, Number(url.searchParams.get('wait') || 0))
    if (wait > 0 && !inbox.some(e => e.seq > after)) await new Promise(done => { const t = setTimeout(() => { waiters.delete(go); done() }, wait * 1000); const go = () => { clearTimeout(t); done() }; waiters.add(go) })
    const lang = url.searchParams.get('lang') || 'en'
    wearerLang = lang
    const tr = url.searchParams.get('translate') === '1'
    const ready = inbox.filter(e => e.seq > after && msgs.get(e.id))
    // A slow model never holds a message back more than 3 s; its reply then comes when the glasses ask for it.
    const drafts = await Promise.all(ready.map(({ id }) => {
      const e = early.get(id)
      return e && e.lang === lang ? Promise.race([e.draft, new Promise(r => setTimeout(() => r(undefined), 3000))]) : undefined
    }))
    const out = []
    for (let i = 0; i < ready.length; i++) {
      const m = msgs.get(ready[i].id), d = drafts[i] || (m.meeting ? { ...m.pre, score: 5 } : undefined)
      // The meaning comes from the same call; a separate translation only when that call gave none.
      const translated = tr ? (d?.meaning ?? await cached(`${m.id}|${lang}`, () => ai.translate(m.text, lang))) : undefined
      out.push({ id: m.id, source: m.source, chat: m.chat, from: m.from, text: m.text, at: m.at, translated, brief: d?.line, score: d?.score, draft: d })
    }
    // Most pressing first, then newest.
    for (const m of out) if (arrivedAt.has(m.id)) { keep(book.shown, now() - arrivedAt.get(m.id)); arrivedAt.delete(m.id) }
    out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.at - a.at)
    return [200, { msgs: out, after: seq }]
  }

  async function draftReply({ req, dev }) {
    const { id, ask, lang } = await body(req)
    if (!meter(dev)) return [429, { error: 'daily draft limit reached on this server' }]
    const m = msgs.get(id)
    if (!m) return [410, { error: 'message gone' }]
    // A sample message with no AI key on the server: the reply written for it ahead of time.
    if (m.pre && !ask && (!ai.ready() || m.meeting)) return [200, { ...noteAi(id, m.pre), ms: 0 }]
    const thread = (threads.get(`${m.source}:${m.chat}`) || []).filter(t => t.id !== m.id)
    const t0 = performance.now()
    // A draft asked for again is the one already made on arrival, never a second call.
    const e = !ask && early.get(id)
    if (e && e.lang === (lang || 'en')) { const d = await e.draft; if (d) return [200, { ...d, ms: Math.round(performance.now() - t0) }] }
    try { return [200, { ...noteAi(id, await ai.draft(m, thread, ask || '', lang || 'en')), ms: Math.round(performance.now() - t0) }] } catch (e) { return [503, { error: String(e.message || e) }] }
  }

  async function sendReply({ req }) {
    const { key, id, text, mark } = await body(req)
    if (!key || !id || !text) return [400, { error: 'key, id and text are needed' }]
    // A retry of the same reply is answered as sent; the same key with other text is refused, never sent.
    const was = state.sent[key]
    if (was) return was.h && was.h !== sha(`${id}
${text}`) ? [409, { error: 'this key already sent a different reply' }] : [200, { ok: true, again: true }]
    const r = state.refs[id]
    const c = r && byName[r.source]
    if (!c) return [410, { error: 'message unknown', drop: true }]
    const by = aiWrote.get(id)?.has(sha(text)) ? 'ai' : 'wearer'
    // The wearer may choose (phone settings) to sign each reply; a connector that has a field for it also gets who wrote it.
    const out = mark ? `${text}\n\n${by === 'ai' ? 'via Gloz · AI draft' : 'via Gloz'}` : text
    const t0 = now()
    try { await c.send({ id, ref: r.ref }, out, { by }) } catch (e) { return [503, { error: String(e.message || e), retry: true }] }
    keep(book.delivered, now() - t0)
    book.sent++
    if (by === 'ai') book.asDrafted++
    state.sent[key] = { at: Date.now(), h: sha(`${id}
${text}`), by }
    r.done = true
    drop(id)
    save()
    c.read?.({ id, ref: r.ref }).catch(() => {})
    return [200, { ok: true, by }]
  }

  async function markRead({ req }) {
    const { id } = await body(req)
    const r = state.refs[id]
    const c = r && byName[r.source]
    if (c) await c.read?.({ id, ref: r.ref }).catch(() => {})
    // Answered: it leaves the list a reopen asks for.
    const i = inbox.findIndex(e => e.id === id)
    if (i >= 0) inbox.splice(i, 1)
    return [200, { ok: true }]
  }

  async function speech({ req, url }) {
    const pcm = await body(req, true)
    try { return [200, await stt.transcribe(pcm, url.searchParams.get('lang') || 'en')] } catch (e) { return [503, { error: String(e.message || e) }] }
  }

  // Listen mode: a few seconds of the room at a time, captioned in the wearer's language.
  // ?spoken= the room's language if the wearer set one (empty: found by the engine), ?lang= the wearer's.
  async function listen({ req, url }) {
    const pcm = await body(req, true)
    const lang = url.searchParams.get('lang') || 'en'
    try {
      const r = await stt.transcribe(pcm, url.searchParams.get('spoken') || '')
      const translated = r.text ? await ai.translate(r.text, lang).catch(() => undefined) : undefined
      return [200, { text: r.text, translated, ms: r.ms }]
    } catch (e) { return [503, { error: String(e.message || e) }] }
  }

  async function tool({ req, url }) {
    const h = MODES[decodeURIComponent(url.pathname.slice(6))]
    if (!h) return [404, { error: 'no such app' }]
    // Ask gets the recent messages of the picked chats (in memory, while unanswered), to answer from them.
    const chats = [...threads.entries()].flatMap(([k, t]) => t.map(x => ({ chat: msgs.get(x.id)?.chat ?? k.split(':').slice(1).join(':'), from: x.from, text: x.text }))).slice(-40)
    try { return [200, await h(await body(req), { ai, env: process.env, chats })] } catch (e) { return [502, { error: String(e.message || e).slice(0, 200) }] }
  }

  const health_ = async () => [200, { ok: true, connectors: health.connectors, errors: health.errors, ai: ai.ready(), aiProvider: ai.provider?.() ?? null, stt: await stt.ready(), paired: state.tokens.length, activeDay: active(DAY), activeMonth: active(30 * DAY) }]

  // A phone ends its own pairing at once (lost phone, new phone): its token stops working.
  async function unpair({ dev }) {
    state.tokens = state.tokens.filter(x => x !== dev)
    seen.delete(dev.h)
    save()
    return [200, { ok: true }]
  }
  // Delete everything: every pairing, message reference, sent record, meeting mark and message still in memory.
  // The server keeps its own keys (they live in its environment, set by its owner); nothing else is left.
  async function forget() {
    state.tokens = []
    state.refs = {}
    // A reply's send key stays 24 h (a hash, never the text), so a retry still never sends it twice.
    state.sent = Object.fromEntries(Object.entries(state.sent).filter(([, v]) => now() - (v.at || 0) < DAY))
    state.meets = {}
    seen.clear()
    for (const id of [...msgs.keys()]) drop(id)
    threads.clear(); early.clear(); lastFrom.clear(); translations.clear(); aiWrote.clear()
    inbox.length = 0
    save()
    return [200, { ok: true }]
  }
  // Published from the server's own log, against the targets: arrival to shown under 2 s, send to delivered under 1 s.
  const stats = async () => [200, { arrivalToShownMs: median(book.shown), sendToDeliveredMs: median(book.delivered), targets: { arrivalToShownMs: 2000, sendToDeliveredMs: 1000 }, repliesSent: book.sent, sentAsDrafted: book.sent ? Math.round(100 * book.asDrafted / book.sent) : null, samples: { shown: book.shown.length, delivered: book.delivered.length } }]
  // The bare address answers like /health, so a judge or an uptime check opening it sees the server is up.
  const OPEN = { 'GET /': health_, 'GET /health': health_, 'GET /stats': stats, 'POST /health': health_, 'POST /pair': pair }
  const PAIRED = { 'GET /inbox': inboxSince, 'POST /draft': draftReply, 'POST /send': sendReply, 'POST /read': markRead, 'POST /stt': speech, 'POST /listen': listen, 'POST /unpair': unpair, 'POST /forget': forget }

  async function handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
    const url = new URL(req.url, 'http://x')
    // HEAD is GET without the body: uptime checks use it.
    const head = req.method === 'HEAD'
    const key = `${head ? 'GET' : req.method} ${url.pathname}`
    const dev = OPEN[key] ? null : authed(req)
    const route = OPEN[key] || (dev ? PAIRED[key] || (req.method === 'POST' && url.pathname.startsWith('/mode/') ? tool : null) : 'unpaired')
    const [code, obj] = route === 'unpaired' ? [401, { error: 'pair first' }] : route ? await route({ req, url, dev }) : [404, { error: 'not found' }]
    res.writeHead(code, { 'content-type': 'application/json' })
    res.end(head ? undefined : JSON.stringify(obj))
  }

  const server = createServer((req, res) => handle(req, res).catch(e => { res.writeHead(e.code === 413 ? 413 : 500); res.end(JSON.stringify({ error: String(e.message) })) }))
  return { server, startPolling, stop, pollOnce, state, pairCode: () => state.pairCode, log }
}
