// Connector tests with no keys: fetch is replaced by replies shaped like each
// service's documented API, and the requests Gloz makes are checked.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const calls = []
let replies = []
beforeEach(() => {
  calls.length = 0
  for (const k of Object.keys(process.env)) if (k.startsWith('GLOZ_')) delete process.env[k]
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), opts })
    const r = replies.find(x => String(url).includes(x.match))
    return { ok: true, status: 200, json: async () => (typeof r?.body === 'function' ? r.body(url, opts) : r?.body ?? {}) }
  }
})
const load = async () => import(`../server/connectors.mjs?${Math.random()}`)

test('Telegram: reads only picked chats, replies in the thread of the message', async () => {
  process.env.GLOZ_TELEGRAM_BOT_TOKEN = 't'
  process.env.GLOZ_TELEGRAM_CHATS = '-100'
  replies = [{ match: 'getUpdates', body: { ok: true, result: [
    { update_id: 5, message: { message_id: 9, date: 1700000000, chat: { id: -100, title: 'Board' }, from: { first_name: 'Layla' }, text: 'هل يمكننا؟' } },
    { update_id: 6, message: { message_id: 3, date: 1700000001, chat: { id: 77 }, from: { first_name: 'Other' }, text: 'not picked' } },
  ] } }]
  const { telegram } = await load()
  const c = telegram()
  const msgs = await c.poll()
  assert.equal(msgs.length, 1)
  assert.equal(msgs[0].from, 'Layla')
  assert.equal(msgs[0].chat, 'Board')
  await c.poll()
  assert.match(calls.at(-1).url, /offset=7/)
  await c.send(msgs[0], 'نعم')
  const body = JSON.parse(calls.at(-1).opts.body)
  assert.deepEqual(body, { chat_id: -100, text: 'نعم', reply_parameters: { message_id: 9 } })
})

test('Slack: the first read sets the starting point, then new messages come with names; replies go in the thread', async () => {
  process.env.GLOZ_SLACK_TOKEN = 'x'
  process.env.GLOZ_SLACK_CHANNELS = 'C1'
  let round = 0
  replies = [
    { match: 'conversations.history', body: () => (round++ === 0 ? { ok: true, messages: [{ ts: '100.1', text: 'old', user: 'U1' }] } : { ok: true, messages: [{ ts: '101.1', text: 'new one', user: 'U1' }] }) },
    { match: 'users.info', body: { ok: true, user: { real_name: 'Sam Lee' } } },
    { match: 'chat.postMessage', body: { ok: true } },
  ]
  const { slack } = await load()
  const c = slack()
  assert.equal((await c.poll()).length, 0)
  const msgs = await c.poll()
  assert.match(calls.find(x => x.url.includes('history') && x.url.includes('oldest')).url, /oldest=100\.1/)
  assert.equal(msgs[0].from, 'Sam Lee')
  await c.send(msgs[0], 'On it.')
  const body = JSON.parse(calls.at(-1).opts.body)
  assert.equal(body.thread_ts, '101.1')
  assert.equal(body.channel, 'C1')
})

test('Discord: skips bots, replies with a reference to the message', async () => {
  process.env.GLOZ_DISCORD_BOT_TOKEN = 'x'
  process.env.GLOZ_DISCORD_CHANNELS = '42'
  let round = 0
  replies = [{ match: '/channels/42/messages', body: (url, opts) => opts.method === 'POST' ? {} : round++ === 0 ? [{ id: '1', content: 'old', author: {}, timestamp: '2026-11-23T10:00:00Z' }] : [{ id: '3', content: 'bot', author: { bot: true }, timestamp: '2026-11-23T10:02:00Z' }, { id: '2', content: 'Ship it today?', author: { global_name: 'Noa' }, timestamp: '2026-11-23T10:01:00Z' }] }]
  const { discord } = await load()
  const c = discord()
  assert.equal((await c.poll()).length, 0)
  const msgs = await c.poll()
  assert.deepEqual(msgs.map(m => m.text), ['Ship it today?'])
  await c.send(msgs[0], 'Yes.')
  assert.deepEqual(JSON.parse(calls.at(-1).opts.body), { content: 'Yes.', message_reference: { message_id: '2' } })
})

test('Gmail: reads the new part of an unread mail, replies in the same thread, marks it read', async () => {
  process.env.GLOZ_GOOGLE_CLIENT_ID = 'a'
  process.env.GLOZ_GOOGLE_CLIENT_SECRET = 'b'
  process.env.GLOZ_GOOGLE_REFRESH_TOKEN = 'c'
  const body = Buffer.from('Can we sign Friday?\r\n\r\nOn Mon, Ana wrote:\r\n> earlier text').toString('base64url')
  replies = [
    { match: 'oauth2.googleapis.com/token', body: { access_token: 'tok', expires_in: 3600 } },
    { match: '/messages?q=', body: { messages: [{ id: 'm1' }] } },
    { match: '/messages/m1?format=full', body: { threadId: 'th1', internalDate: '1700000000000', snippet: 's', payload: { mimeType: 'multipart/alternative', headers: [{ name: 'Subject', value: 'Contract' }, { name: 'From', value: '"Priya N" <p@example.com>' }, { name: 'Message-ID', value: '<id1@x>' }], parts: [{ mimeType: 'text/plain', body: { data: body } }] } } },
    { match: '/messages/send', body: {} },
    { match: '/modify', body: {} },
  ]
  const { gmail } = await load()
  const c = gmail()
  const msgs = await c.poll()
  assert.equal(msgs[0].text, 'Can we sign Friday?')
  assert.equal(msgs[0].from, 'Priya N')
  await c.send(msgs[0], 'Yes, Friday.')
  const sent = JSON.parse(calls.find(x => x.url.endsWith('/messages/send')).opts.body)
  assert.equal(sent.threadId, 'th1')
  const raw = Buffer.from(sent.raw, 'base64url').toString('utf8')
  assert.match(raw, /In-Reply-To: <id1@x>/)
  assert.match(raw, /\r\n\r\nYes, Friday\.$/)
  await c.read(msgs[0])
  assert.ok(calls.some(x => x.url.includes('/m1/modify')))
})

test('no keys, no connectors', async () => {
  const { connectors } = await load()
  assert.equal(connectors().length, 0)
})

test('AI drafts: when the first provider fails, the next one writes the draft', async () => {
  process.env.GLOZ_OPENROUTER_KEY = 'a'
  process.env.GLOZ_ANTHROPIC_KEY = 'b'
  globalThis.fetch = async (url) => {
    calls.push({ url: String(url) })
    if (String(url).includes('openrouter')) return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"reply":"نعم، الثالثة مناسبة.","gloss":"Yes, three works."}' }] }) }
  }
  const ai = await import(`../server/ai.mjs?${Math.random()}`)
  const d = await ai.draft({ chat: 'Board', from: 'Layla', text: 'هل يمكننا نقل الاجتماع إلى الثالثة؟' }, [], '', 'en')
  assert.deepEqual(calls.map(c => new URL(c.url).host), ['openrouter.ai', 'api.anthropic.com'])
  assert.equal(d.by, 'ai')
  assert.equal(d.lang, 'ar')
  assert.equal(d.gloss, 'Yes, three works.')
})

test('AI drafts: up to three replies to pick from; none when the wearer gave an instruction', async () => {
  process.env.GLOZ_OPENROUTER_KEY = 'a'
  delete process.env.GLOZ_ANTHROPIC_KEY
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"reply":"I will confirm shortly.","gloss":"","alts":[{"reply":"Yes, 3 works.","gloss":""},{"reply":"Can we do 4?","gloss":""},{"reply":"A fourth"}]}' } }] }) })
  const ai = await import(`../server/ai.mjs?${Math.random()}`)
  const d = await ai.draft({ chat: 'Board', from: 'Sam', text: 'Can we move the call to 3?' }, [], '', 'en')
  assert.deepEqual(d.alts.map(a => a.text), ['I will confirm shortly.', 'Yes, 3 works.', 'Can we do 4?'])
  const told = await ai.draft({ chat: 'Board', from: 'Sam', text: 'Can we move the call to 3?' }, [], 'say yes', 'en')
  assert.equal(told.alts, undefined)
})

test('Telegram: the listener asks Telegram to hold the request open and pushes each message as it comes', async () => {
  process.env.GLOZ_TELEGRAM_BOT_TOKEN = 't'
  let n = 0
  replies = [{ match: 'getUpdates', body: () => (++n === 1 ? { ok: true, result: [{ update_id: 1, message: { message_id: 2, date: 1700000000, chat: { id: 5 }, from: { first_name: 'Ana' }, text: 'now?' } }] } : { ok: true, result: [] }) }]
  const { telegram } = await load()
  const pushed = []
  await telegram().listen(ms => pushed.push(...ms), () => n >= 2)
  assert.equal(pushed.length, 1)
  assert.equal(pushed[0].text, 'now?')
  assert.match(calls[0].url, /timeout=25/)
})
