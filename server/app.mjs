// Gloz backend. Holds every key; the glasses app holds only a pairing token.
// Routes (JSON unless noted):
//   GET  /health                      what is set up, no secrets
//   POST /pair      {code}            -> {token}  (the code is printed when the server starts)
//   GET  /inbox?after=N&lang=en&translate=1 -> {msgs, after}
//   POST /draft     {id, ask?, lang?} -> {text, gloss?, by}
//   POST /send      {key, id, text}   -> {ok} once per key, however often it is retried
//   POST /read      {id}
//   POST /stt       raw PCM body      -> {text, ms, engine}
import { createServer } from 'node:http'
import { randomBytes, createHash, randomInt } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const sha = s => createHash('sha256').update(s).digest('hex')

export function createApp({ connectors = [], ai, stt, dataDir, pollMs = 2000, log = console.log }) {
  mkdirSync(dataDir, { recursive: true })
  const file = join(dataDir, 'state.json')
  let state
  try { state = JSON.parse(readFileSync(file, 'utf8')) } catch { state = {} }
  state.tokens ??= []
  state.sent ??= {}
  state.refs ??= {}
  state.pairCode ??= process.env.GLOZ_PAIR_CODE || String(randomInt(100000, 1000000))
  // Written to a temp file first, so a crash mid-write never loses the sent list.
  const save = () => { writeFileSync(file + '.tmp', JSON.stringify(state)); renameSync(file + '.tmp', file) }
  save()

  // Message text lives in memory only, and is dropped once the reply is sent.
  const msgs = new Map()
  const inbox = []          // [{seq, id}]
  const pairLock = { wrong: 0, until: 0 }   // wrong pairing codes in a row, and when pairing opens again
  const threads = new Map() // chat id -> last messages, for draft context
  let seq = 0
  const translations = new Map()

  function add(m) {
    if (msgs.has(m.id) || state.refs[m.id]?.done) return
    msgs.set(m.id, m)
    state.refs[m.id] = { source: m.source, ref: m.ref, at: m.at }
    inbox.push({ seq: ++seq, id: m.id })
    const key = `${m.source}:${m.chat}`
    const t = threads.get(key) || []
    t.push({ from: m.from, text: m.text })
    threads.set(key, t.slice(-10))
  }

  // Refs older than 7 days are forgotten.
  function prune() {
    const old = Date.now() - 7 * 864e5
    for (const [id, r] of Object.entries(state.refs)) if ((r.at || 0) < old) delete state.refs[id]
  }

  const health = { connectors: connectors.map(c => c.name), errors: {} }
  async function pollOnce() {
    for (const c of connectors) {
      try { for (const m of await c.poll()) add(m); delete health.errors[c.name] } catch (e) { health.errors[c.name] = String(e.message || e) }
    }
    prune()
    save()
  }
  let timer = null
  const startPolling = () => { if (!timer) { pollOnce(); timer = setInterval(pollOnce, pollMs) } }
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
    return t && state.tokens.includes(sha(t))
  }

  async function handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)) }
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }
    const url = new URL(req.url, 'http://x')
    const p = url.pathname

    if (p === '/health') return send(200, { ok: true, connectors: health.connectors, errors: health.errors, ai: ai.ready(), stt: await stt.ready(), paired: state.tokens.length })
    if (p === '/pair' && req.method === 'POST') {
      const { code } = await body(req)
      // Five wrong codes retire the code and stop pairing for a minute, so it cannot be guessed:
      // 5 tries against 900,000 codes.
      if (Date.now() < pairLock.until) return send(429, { error: 'too many wrong codes, try again in a minute' })
      if (String(code || '').trim() !== state.pairCode) {
        if (++pairLock.wrong >= 5) {
          pairLock.wrong = 0
          pairLock.until = Date.now() + 60_000
          if (!process.env.GLOZ_PAIR_CODE) { state.pairCode = String(randomInt(100000, 1000000)); save(); log(`Five wrong codes: new pairing code ${state.pairCode}`) }
        }
        return send(403, { error: 'wrong code' })
      }
      pairLock.wrong = 0
      const token = randomBytes(24).toString('base64url')
      state.tokens.push(sha(token))
      // Each code pairs once; a new one is printed for the next device.
      if (!process.env.GLOZ_PAIR_CODE) { state.pairCode = String(randomInt(100000, 1000000)); log(`Pairing code for the next device: ${state.pairCode}`) }
      save()
      return send(200, { token })
    }
    if (!authed(req)) return send(401, { error: 'pair first' })

    if (p === '/inbox') {
      const after = Number(url.searchParams.get('after') || 0)
      const lang = url.searchParams.get('lang') || 'en'
      const tr = url.searchParams.get('translate') === '1'
      const out = []
      for (const { seq: s, id } of inbox) {
        if (s <= after) continue
        const m = msgs.get(id)
        if (!m) continue
        let translated
        if (tr) {
          const k = `${id}|${lang}`
          if (!translations.has(k)) translations.set(k, await ai.translate(m.text, lang).catch(() => undefined))
          translated = translations.get(k)
        }
        const bk = `${id}|brief|${lang}`
        if (ai.brief && !translations.has(bk)) translations.set(bk, await ai.brief(m.text, lang).catch(() => undefined))
        out.push({ id: m.id, source: m.source, chat: m.chat, from: m.from, text: m.text, at: m.at, translated, brief: translations.get(bk) })
      }
      return send(200, { msgs: out, after: seq })
    }
    if (p === '/draft' && req.method === 'POST') {
      const { id, ask, lang } = await body(req)
      const m = msgs.get(id)
      if (!m) return send(410, { error: 'message gone' })
      const thread = (threads.get(`${m.source}:${m.chat}`) || []).slice(0, -1)
      const t0 = performance.now()
      try {
        const d = await ai.draft(m, thread, ask || '', lang || 'en')
        return send(200, { ...d, ms: Math.round(performance.now() - t0) })
      } catch (e) { return send(503, { error: String(e.message || e) }) }
    }
    if (p === '/send' && req.method === 'POST') {
      const { key, id, text } = await body(req)
      if (!key || !id || !text) return send(400, { error: 'key, id and text are needed' })
      if (state.sent[key]) return send(200, { ok: true, again: true })
      const r = state.refs[id]
      const c = r && byName[r.source]
      if (!c) return send(410, { error: 'message unknown', drop: true })
      try { await c.send({ id, ref: r.ref }, text) } catch (e) { return send(503, { error: String(e.message || e), retry: true }) }
      state.sent[key] = Date.now()
      r.done = true
      msgs.delete(id)
      save()
      c.read?.({ id, ref: r.ref }).catch(() => {})
      return send(200, { ok: true })
    }
    if (p === '/read' && req.method === 'POST') {
      const { id } = await body(req)
      const r = state.refs[id]
      const c = r && byName[r.source]
      if (c) await c.read?.({ id, ref: r.ref }).catch(() => {})
      // Answered: it leaves the list a reopen asks for.
      const i = inbox.findIndex(e => e.id === id)
      if (i >= 0) inbox.splice(i, 1)
      return send(200, { ok: true })
    }
    if (p === '/stt' && req.method === 'POST') {
      const pcm = await body(req, true)
      try { return send(200, await stt.transcribe(pcm, url.searchParams.get('lang') || 'en')) } catch (e) { return send(503, { error: String(e.message || e) }) }
    }
    // Listen mode: a few seconds of the room at a time, captioned in the wearer's language.
    // ?spoken= the room's language if the wearer set one (empty: found by the engine), ?lang= the wearer's.
    if (p === '/listen' && req.method === 'POST') {
      const pcm = await body(req, true)
      const lang = url.searchParams.get('lang') || 'en'
      try {
        const r = await stt.transcribe(pcm, url.searchParams.get('spoken') || '')
        const translated = r.text ? await ai.translate(r.text, lang).catch(() => undefined) : undefined
        return send(200, { text: r.text, translated, ms: r.ms })
      } catch (e) { return send(503, { error: String(e.message || e) }) }
    }
    return send(404, { error: 'not found' })
  }

  const server = createServer((req, res) => handle(req, res).catch(e => { res.writeHead(e.code === 413 ? 413 : 500); res.end(JSON.stringify({ error: String(e.message) })) }))
  return { server, startPolling, stop, pollOnce, state, pairCode: () => state.pairCode, log }
}
