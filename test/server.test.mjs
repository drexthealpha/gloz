// Backend tests with no keys: a stand-in service records what would be sent.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.mjs'
import * as ai from '../server/ai.mjs'
import { guessLang } from '../server/lang.mjs'
import { pcmToFloat } from '../server/stt.mjs'

function fakeService() {
  const sent = []
  let down = false
  let queue = []
  return {
    sent,
    setDown(v) { down = v },
    push(m) { queue.push(m) },
    conn: {
      name: 'telegram',
      async poll() { const q = queue; queue = []; return q },
      async send(msg, text) { if (down) throw new Error('network down'); sent.push({ id: msg.id, text }) },
      async read() {},
    },
  }
}

async function boot(svc) {
  for (const k of Object.keys(process.env)) if (k.startsWith('GLOZ_')) delete process.env[k]
  const app = createApp({
    connectors: [svc.conn],
    ai: { ready: ai.aiReady, draft: ai.draft, translate: ai.translate },
    stt: { ready: async () => false, transcribe: async () => { throw new Error('no speech engine') } },
    dataDir: mkdtempSync(join(tmpdir(), 'gloz-')),
  })
  await new Promise(r => app.server.listen(0, r))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const call = async (path, body, token) => {
    const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    return { status: r.status, json: await r.json() }
  }
  return { app, call }
}

const msg = (id, text) => ({ id: `telegram:1:${id}`, source: 'telegram', chat: 'Board', from: 'Ana', text, at: Date.now(), ref: { chat: 1, mid: id } })

test('nothing works before pairing, and a wrong code is refused', async () => {
  const svc = fakeService()
  const { app, call } = await boot(svc)
  assert.equal((await call('/inbox')).status, 401)
  assert.equal((await call('/pair', { code: 'nope' })).status, 403)
  const code = app.pairCode()
  const { json } = await call('/pair', { code })
  assert.ok(json.token.length > 20)
  // A code works once.
  assert.equal((await call('/pair', { code })).status, 403)
  app.server.close()
})

test('end to end: message in, draft, one send, retried send is not sent twice', async () => {
  const svc = fakeService()
  const { app, call } = await boot(svc)
  const { json: { token } } = await call('/pair', { code: app.pairCode() })
  svc.push(msg(7, 'هل يمكننا نقل الاجتماع إلى الثالثة؟'))
  await app.pollOnce()
  const inbox = (await call('/inbox?after=0', null, token)).json
  assert.equal(inbox.msgs.length, 1)
  const id = inbox.msgs[0].id
  // No AI key in tests: the holding reply, in the sender's language, labelled as such.
  const d = (await call('/draft', { id, lang: 'en' }, token)).json
  assert.equal(d.by, 'default')
  assert.match(d.text, /سأرد/)
  assert.match(d.gloss, /reply/)
  // The phone drops mid-send: the backend says retry and sends nothing.
  svc.setDown(true)
  assert.equal((await call('/send', { key: 'k1', id, text: d.text }, token)).status, 503)
  assert.equal(svc.sent.length, 0)
  svc.setDown(false)
  assert.equal((await call('/send', { key: 'k1', id, text: d.text }, token)).json.ok, true)
  // The app retries the same key after a drop: still one message at the service.
  assert.equal((await call('/send', { key: 'k1', id, text: d.text }, token)).json.again, true)
  // The same key with other text is refused, and nothing more goes out.
  assert.equal((await call('/send', { key: 'k1', id, text: 'something else' }, token)).status, 409)
  assert.equal(svc.sent.length, 1)
  // The text is gone from the backend once the reply is sent.
  assert.equal((await call('/inbox?after=0', null, token)).json.msgs.length, 0)
  app.server.close()
})

test('a message marked read leaves the list a reopen asks for; an unanswered one stays', async () => {
  const svc = fakeService()
  const { app, call } = await boot(svc)
  const { json: { token } } = await call('/pair', { code: app.pairCode() })
  svc.push(msg(1, 'first'))
  svc.push(msg(2, 'second'))
  await app.pollOnce()
  const all = (await call('/inbox?after=0', null, token)).json.msgs
  assert.equal(all.length, 2)
  await call('/read', { id: all[0].id }, token)
  const left = (await call('/inbox?after=0', null, token)).json.msgs
  assert.deepEqual(left.map(x => x.id), [all[1].id])
  app.server.close()
})

test('the sent list survives a backend restart', async () => {
  const svc = fakeService()
  const dir = mkdtempSync(join(tmpdir(), 'gloz-'))
  const mk = () => createApp({ connectors: [svc.conn], ai: { ready: () => false, draft: ai.draft, translate: ai.translate }, stt: { ready: async () => false, transcribe: async () => ({}) }, dataDir: dir })
  const a = mk()
  a.state.sent.k9 = 1
  a.state.tokens.push('x')
  // A new message changes the state, so the poll writes it.
  svc.push(msg(3, 'x'))
  await a.pollOnce()
  const b = mk()
  assert.equal(b.state.sent.k9, 1)
  assert.equal(b.pairCode(), a.pairCode())
})

test('language guess picks the reply language for ten scripts', () => {
  const cases = { ar: 'من أين أتيت؟', fa: 'فکر میکنم میفهمم', he: 'שלום לך', hi: 'नमस्ते आप', th: 'สวัสดีครับ', ko: '안녕하세요', ja: 'こんにちは', zh: '你好吗', ru: 'Привет', en: 'Hello there' }
  for (const [k, v] of Object.entries(cases)) assert.equal(guessLang(v), k, v)
})

test('sample mode: each sample message gets the reply written for it ahead of time, with alternatives', async () => {
  const { sample } = await import('../server/connectors.mjs')
  process.env.GLOZ_SAMPLE = '1'
  const svc = sample()
  delete process.env.GLOZ_SAMPLE
  const app = createApp({ connectors: [svc], ai: { ready: () => false, draft: ai.draft, translate: ai.translate }, stt: { ready: async () => false, transcribe: async () => ({}) }, dataDir: mkdtempSync(join(tmpdir(), 'gloz-')) })
  await new Promise(r => app.server.listen(0, r))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const { token } = await (await fetch(base + '/pair', { method: 'POST', body: JSON.stringify({ code: app.pairCode() }) })).json()
  await app.pollOnce()
  const call = async (p, b) => (await fetch(base + p, { method: b ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}` }, body: b && JSON.stringify(b) })).json()
  const first = (await call('/inbox?after=0')).msgs[0]
  const d = await call('/draft', { id: first.id, lang: 'en' })
  assert.equal(d.by, 'ai')
  assert.equal(d.alts.length, 3)
  assert.equal(d.text, d.alts[0].text)
  app.server.close()
})

test('long polling: a waiting inbox request answers the moment a message arrives', async () => {
  const svc = fakeService()
  const { app, call } = await boot(svc)
  const { json: { token } } = await call('/pair', { code: app.pairCode() })
  const t0 = Date.now()
  const pending = call('/inbox?after=0&wait=10', null, token)
  setTimeout(() => { svc.push(msg(9, 'now?')); void app.pollOnce() }, 300)
  const r = await pending
  assert.equal(r.json.msgs.length, 1)
  assert.ok(Date.now() - t0 < 3000, `answered after ${Date.now() - t0} ms`)
  // Nothing new: the request waits its time out, then answers empty.
  const t1 = Date.now()
  const empty = await call(`/inbox?after=${r.json.after}&wait=1`, null, token)
  assert.equal(empty.json.msgs.length, 0)
  assert.ok(Date.now() - t1 >= 900)
  app.server.close()
})

test('PCM from the glasses becomes audio samples', () => {
  const b = Buffer.alloc(4)
  b.writeInt16LE(16384, 0)
  b.writeInt16LE(-32768, 2)
  assert.deepEqual([...pcmToFloat(b)], [0.5, -1])
})

test('listen: a piece of room audio comes back as a caption in the wearer language', async () => {
  const app = createApp({
    connectors: [],
    ai: { ready: () => true, draft: async () => ({}), translate: async (t, l) => (l === 'en' ? 'We can ship on Friday.' : t) },
    stt: { ready: async () => true, transcribe: async (pcm, spoken) => ({ text: 'Можем отправить в пятницу.', ms: 5, spoken }) },
    dataDir: mkdtempSync(join(tmpdir(), 'gloz-')),
  })
  await new Promise(r => app.server.listen(0, r))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const { token } = await (await fetch(base + '/pair', { method: 'POST', body: JSON.stringify({ code: app.pairCode() }) })).json()
  const r = await fetch(base + '/listen?lang=en&spoken=', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: Buffer.alloc(128000) })
  const j = await r.json()
  assert.equal(j.text, 'Можем отправить в пятницу.')
  assert.equal(j.translated, 'We can ship on Friday.')
  app.server.close()
})

test('five wrong pairing codes stop pairing for a minute, so the code cannot be guessed', async () => {
  const svc = fakeService()
  const { app, call } = await boot(svc)
  for (let i = 0; i < 5; i++) assert.equal((await call('/pair', { code: 'nope' + i })).status, 403)
  // Even the right code waits now.
  assert.equal((await call('/pair', { code: app.pairCode() })).status, 429)
  // Only for that client: another one pairs with the new code, so one guesser cannot lock everyone out.
  const other = await fetch(`http://[::1]:${app.server.address().port}/pair`, { method: 'POST', body: JSON.stringify({ code: app.pairCode() }) })
  assert.equal(other.status, 200)
  app.server.close()
})

test('a phone ends its own pairing at once; the owner sees use counts with no text; drafts have a daily cap', async () => {
  const svc = fakeService()
  const { app, call } = await boot(svc)
  process.env.GLOZ_DRAFTS_PER_DAY = '2'
  const { json: { token } } = await call('/pair', { code: app.pairCode() })
  svc.push(msg(5, 'hello'))
  await app.pollOnce()
  const id = (await call('/inbox?after=0', null, token)).json.msgs[0].id
  assert.equal((await call('/draft', { id }, token)).status, 200)
  assert.equal((await call('/draft', { id }, token)).status, 200)
  assert.equal((await call('/draft', { id }, token)).status, 429)
  const h = (await call('/health')).json
  assert.deepEqual([h.paired, h.activeDay, h.activeMonth], [1, 1, 1])
  assert.equal(JSON.stringify(h).includes('hello'), false)
  assert.equal((await call('/unpair', {}, token)).status, 200)
  assert.equal((await call('/inbox', null, token)).status, 401)
  assert.equal((await call('/health')).json.paired, 0)
  delete process.env.GLOZ_DRAFTS_PER_DAY
  app.server.close()
})

test('once a reply is sent, its message leaves the chat context the next draft sees', async () => {
  const svc = fakeService()
  const seen = []
  for (const k of Object.keys(process.env)) if (k.startsWith('GLOZ_')) delete process.env[k]
  const app = createApp({
    connectors: [svc.conn],
    ai: { ready: () => true, draft: async (m, thread) => { seen.push(thread.map(t => t.text)); return { text: 'ok', by: 'test' } }, translate: async t => t },
    stt: { ready: async () => false, transcribe: async () => ({}) },
    dataDir: mkdtempSync(join(tmpdir(), 'gloz-')),
  })
  await new Promise(r => app.server.listen(0, r))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const call = async (path, body, token) => (await fetch(base + path, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) })).json()
  const { token } = await call('/pair', { code: app.pairCode() })
  svc.push(msg(1, 'secret one'))
  svc.push(msg(2, 'second'))
  await app.pollOnce()
  await call('/send', { key: 'a', id: msg(1).id, text: 'ok' }, token)
  await call('/draft', { id: msg(2).id }, token)
  assert.deepEqual(seen.at(-1), [])   // "secret one" is gone, not kept as context
  app.server.close()
})

test('a pairing in daily use never ends; one unused for 90 days ends', async () => {
  let t = Date.parse('2026-01-01T00:00:00Z')
  const app = createApp({
    connectors: [],
    ai: { ready: () => false, draft: ai.draft, translate: ai.translate },
    stt: { ready: async () => false, transcribe: async () => ({}) },
    dataDir: mkdtempSync(join(tmpdir(), 'gloz-')),
    now: () => t,
  })
  await new Promise(r => app.server.listen(0, r))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const pair = async () => (await (await fetch(base + '/pair', { method: 'POST', body: JSON.stringify({ code: app.pairCode() }) })).json()).token
  const ok = async tok => (await fetch(base + '/inbox', { headers: { authorization: `Bearer ${tok}` } })).status !== 401
  const daily = await pair()
  const idle = await pair()
  for (let d = 0; d < 365; d++) { t += 24 * 3600 * 1000; assert.ok(await ok(daily), `day ${d + 1}`) }
  assert.equal(await ok(idle), false)
  app.server.close()
})
