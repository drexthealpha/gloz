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
  await a.pollOnce()
  const b = mk()
  assert.equal(b.state.sent.k9, 1)
  assert.equal(b.pairCode(), a.pairCode())
})

test('language guess picks the reply language for ten scripts', () => {
  const cases = { ar: 'من أين أتيت؟', fa: 'فکر میکنم میفهمم', he: 'שלום לך', hi: 'नमस्ते आप', th: 'สวัสดีครับ', ko: '안녕하세요', ja: 'こんにちは', zh: '你好吗', ru: 'Привет', en: 'Hello there' }
  for (const [k, v] of Object.entries(cases)) assert.equal(guessLang(v), k, v)
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
  app.server.close()
})
