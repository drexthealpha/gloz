// Tasks: the app's presses and the server handler, with no keys and no network (fetch is replaced).
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { tasksApp, sampleTasks } from '../app/src/modes/tasks.ts'
import { handle, doneProp } from '../server/modes/tasks.mjs'
import { forgetGoogleToken } from '../server/modes/notes.mjs'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch; forgetGoogleToken() })
const tick = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)) }
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })

function fakeCtx(reply) {
  const calls = [], mics = [], kept = new Map()
  const ctx = {
    call: async b => { calls.push(b); const r = await reply(b); if (r instanceof Error) throw r; return r },
    lang: () => 'en', render() {}, mic: async on => { mics.push(on) }, locate: async () => null,
    store: { get: k => kept.get(k) ?? null, set: (k, v) => kept.set(k, v) },
  }
  return { ctx, calls, mics }
}

test('handler with no account: sample tasks; done and add change this run only', async () => {
  const before = await handle({ action: 'list' }, { env: {} })
  assert.equal(before.source, 'sample')
  assert.equal(before.tasks.length, sampleTasks({ action: 'list' }).tasks.length)
  assert.equal((await handle({ action: 'done', id: 'sample-1' }, { env: {} })).sample, true)
  const add = await handle({ action: 'add', title: 'Water the plants' }, { env: {} })
  const after = await handle({ action: 'list' }, { env: {} })
  assert.equal(after.tasks[0].title, 'Water the plants')
  assert.ok(!after.tasks.some(t => t.id === 'sample-1'))
  assert.equal(add.task.title, 'Water the plants')
  assert.deepEqual(await handle({ action: 'add', title: '  ' }, { env: {} }), { error: 'Nothing to add' })
})

test('Notion: open tasks by the Done checkbox, mark done, add', async () => {
  const seen = []
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url), m = opts.method ?? 'GET', body = opts.body ? JSON.parse(opts.body) : null
    seen.push({ m, path: u.pathname, body })
    assert.equal(opts.headers['user-agent'], 'Gloz/0.1')
    if (m === 'GET') return json({ properties: { Task: { type: 'title' }, Done: { type: 'checkbox' } } })
    if (u.pathname.endsWith('/query')) return json({ results: [{ id: 't1', properties: { Task: { type: 'title', title: [{ plain_text: 'Pay rent' }] } } }] })
    if (m === 'POST') return json({ id: 't2' })
    return json({})
  }
  const env = { GLOZ_NOTION_TOKEN: 'test-token', GLOZ_NOTION_TASKS_DB: 'tdb' }
  assert.deepEqual((await handle({ action: 'list' }, { env })).tasks, [{ id: 't1', title: 'Pay rent' }])
  assert.deepEqual(seen.find(s => s.path.endsWith('/query')).body.filter, { property: 'Done', checkbox: { equals: false } })
  assert.deepEqual(await handle({ action: 'done', id: 't1' }, { env }), { ok: true })
  assert.deepEqual(seen.at(-1), { m: 'PATCH', path: '/v1/pages/t1', body: { properties: { Done: { checkbox: true } } } })
  assert.deepEqual(await handle({ action: 'add', title: 'Call Ana' }, { env }), { ok: true, task: { id: 't2', title: 'Call Ana' } })
  assert.deepEqual(seen.at(-1).body.properties, { Task: { title: [{ text: { content: 'Call Ana' } }] } })
})

test('Notion: a status column with Done works; none gives a setup line', () => {
  assert.deepEqual(doneProp({ properties: { S: { type: 'status', status: { options: [{ name: 'Not started' }, { name: 'Done' }] } } } }), { name: 'S', type: 'status', value: 'Done' })
  assert.equal(doneProp({ properties: { Name: { type: 'title' } } }), null)
})

test('Google Tasks: list open tasks, mark done, add; refused access is a setup line', async () => {
  const seen = []
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url), m = opts.method ?? 'GET'
    if (u.host === 'oauth2.googleapis.com') return json({ access_token: 'test-access', expires_in: 3600 })
    seen.push({ m, url: u.pathname + u.search, body: opts.body })
    if (m === 'GET') return json({ items: [{ id: 'g1', title: 'Renew passport' }, { id: 'g2', title: '' }] })
    if (m === 'POST') return json({ id: 'g3', title: 'Buy tape' })
    return json({})
  }
  const env = { GLOZ_GOOGLE_CLIENT_ID: 'id', GLOZ_GOOGLE_CLIENT_SECRET: 'secret', GLOZ_GOOGLE_REFRESH_TOKEN: 'refresh' }
  assert.deepEqual((await handle({ action: 'list' }, { env })).tasks, [{ id: 'g1', title: 'Renew passport' }])
  assert.match(seen[0].url, /showCompleted=false/)
  await handle({ action: 'done', id: 'g1' }, { env })
  assert.deepEqual(seen.at(-1), { m: 'PATCH', url: '/tasks/v1/lists/@default/tasks/g1', body: '{"status":"completed"}' })
  assert.deepEqual((await handle({ action: 'add', title: 'Buy tape' }, { env })).task, { id: 'g3', title: 'Buy tape' })
  globalThis.fetch = async () => json({}, 403)
  forgetGoogleToken()
  assert.deepEqual(await handle({ action: 'list' }, { env }), { error: 'Google: sign in again with Docs and Tasks access' })
})

test('the app: tap asks first, tap again marks done; down cancels', async () => {
  const { ctx, calls } = fakeCtx(sampleTasks)
  const m = tasksApp.make(ctx)
  await m.start()
  assert.equal(m.card().text, 'Sample: book the dentist')
  assert.equal(m.card().hint, 'tap: done · down: next · up: back · hold: add')
  m.input('next'); assert.equal(m.card().text, 'Sample: send the invoice to Marta')
  m.input('tap')
  assert.equal(m.card().hint, 'tap again to mark done · down: keep')
  m.input('next')
  assert.equal(m.card().text, 'Sample: send the invoice to Marta')
  assert.ok(!calls.some(c => c.action === 'done'))
  m.input('tap'); m.input('tap'); await tick()
  assert.deepEqual(calls.at(-1), { action: 'done', id: 'sample-2' })
  assert.equal(m.card().text, 'Sample: buy bread and milk')
  assert.match(m.card().hint, /^Done here only \(sample\) · /)
  assert.deepEqual(m.card().progress, [2, 3])
})

test('the app: hold, speak, release, tap adds the task', async () => {
  const { ctx, calls, mics } = fakeCtx(b => b.action === 'stt' ? { text: 'Buy tape' } : sampleTasks(b))
  const m = tasksApp.make(ctx)
  await m.start()
  m.input('hold')
  assert.equal(m.card().text, 'Listening')
  m.audio(new Uint8Array(32000))
  m.input('release'); await tick()
  assert.deepEqual(mics, [true, false])
  assert.equal(m.card().text, 'Buy tape')
  m.input('tap'); await tick()
  assert.deepEqual(calls.at(-1), { action: 'add', title: 'Buy tape' })
  assert.equal(m.card().text, 'Buy tape')
  assert.deepEqual(m.card().progress, [1, 5])
})

test('the app: nothing heard and no signal show lines, never a blank', async () => {
  let r = new Error('offline')
  const { ctx } = fakeCtx(b => b.action === 'stt' ? { text: '' } : r instanceof Error ? r : sampleTasks(b))
  const m = tasksApp.make(ctx)
  await m.start()
  assert.equal(m.card().text, 'No signal')
  r = null
  m.input('tap'); await tick()
  m.input('hold'); m.input('release'); await tick()
  assert.equal(m.card().text, 'Nothing heard')
  m.input('next')
  assert.equal(m.card().text, 'Sample: book the dentist')
})
