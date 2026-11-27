import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextMeeting, lastChatOf, meetingMsg, clock, LEAD_MS } from '../server/meeting.mjs'

test('the meeting card: the next meeting within 10 minutes, who and when, and the chat where that person last wrote', async () => {
  const now = Date.parse('2026-11-28T14:50:00Z')
  let asked = ''
  const get = async url => { asked = url; return { items: [
    { id: 'all', start: { date: '2026-11-28' }, attendees: [{ displayName: 'Team' }] },
    { id: 'e1', summary: 'Pricing call', start: { dateTime: '2026-11-28T15:00:00Z' }, attendees: [{ email: 'me@x.com', self: true }, { displayName: 'Sam Lee', email: 'sam@x.com' }, { email: 'room@x.com', resource: true }] },
  ] } }
  const ev = await nextMeeting(get, now)
  assert.match(asked, /calendars\/primary\/events\?timeMin=2026-11-28T14%3A50/)
  assert.deepEqual({ id: ev.id, who: ev.who, title: ev.title }, { id: 'e1', who: 'Sam Lee', title: 'Pricing call' })
  assert.equal(LEAD_MS, 600000)
  // Sam wrote last on Slack, earlier on Telegram: the card goes to Slack.
  const seen = new Map([['Sam', { source: 'telegram', chat: 'Board', ref: { chat: 1, mid: 2 }, at: 1 }], ['Sam Lee', { source: 'slack', chat: '#deals', ref: { ch: 'C1', ts: '9.1' }, at: 5 }], ['Ana', { source: 'discord', chat: 'g', ref: {}, at: 9 }]])
  const chat = lastChatOf(ev.who, seen)
  assert.equal(chat.source, 'slack')
  const m = meetingMsg(ev, chat)
  assert.equal(m.from, 'Sam Lee · Slack')
  assert.equal(m.text, `Pricing call, ${clock(ev.at)}`)
  assert.deepEqual(m.ref, { ch: 'C1', ts: '9.1' })
  assert.equal(m.pre.text, 'On my way.')
  // Nobody to write to, or no meeting: no card.
  assert.equal(lastChatOf('Priya', seen), null)
  assert.equal(await nextMeeting(async () => ({ items: [] }), now), null)
})

test('the server puts the meeting card first, once, with "On my way." to send in the chat where that person last wrote', async () => {
  const { createApp } = await import('../server/app.mjs')
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  let t = Date.parse('2026-11-28T14:50:00Z')
  const sent = []
  let queue = [{ id: 'slack:C1:9.1', source: 'slack', chat: '#deals', from: 'Sam Lee', text: 'see you soon', at: t - 60000, ref: { ch: 'C1', ts: '9.1' } }]
  const conn = { name: 'slack', async poll() { const q = queue; queue = []; return q }, async send(m, text) { sent.push({ ref: m.ref, text }) }, async read() {} }
  const calendar = async () => ({ items: [{ id: 'e1', summary: 'Pricing call', start: { dateTime: '2026-11-28T15:00:00Z' }, attendees: [{ self: true }, { displayName: 'Sam Lee' }] }] })
  const app = createApp({ connectors: [conn], ai: { ready: () => false, draft: async () => ({ text: 'x', by: 'default' }), translate: async () => undefined }, stt: { ready: async () => false }, dataDir: mkdtempSync(join(tmpdir(), 'gloz-')), now: () => t, calendar })
  await new Promise(r => app.server.listen(0, r))
  const base = `http://127.0.0.1:${app.server.address().port}`
  const call = async (p, body, token) => { const r = await fetch(base + p, { method: body ? 'POST' : 'GET', headers: token ? { authorization: `Bearer ${token}` } : {}, body: body ? JSON.stringify(body) : undefined }); return r.json() }
  const { token } = await call('/pair', { code: app.pairCode() })
  await app.pollOnce()
  t += 61000
  await app.pollOnce()
  const r = await call('/inbox?after=0&lang=en', null, token)
  app.server.close()
  assert.equal(r.msgs[0].id, 'meet:e1')
  assert.equal(r.msgs[0].from, 'Sam Lee · Slack')
  assert.equal(r.msgs[0].draft.text, 'On my way.')
  assert.equal(r.msgs.filter(m => m.id === 'meet:e1').length, 1)
})
