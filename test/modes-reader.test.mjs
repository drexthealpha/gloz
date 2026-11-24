// Reader: the app's presses and the server handler, with no keys and no network (fetch is replaced).
// Also measures the longest text the reader pages through intact.
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readerApp, sampleReader, pageStarts } from '../app/src/modes/reader.ts'
import { handle } from '../server/modes/reader.mjs'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })
const tick = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)) }
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })

function fakeCtx(reply, kept = new Map()) {
  const calls = []
  const ctx = {
    call: async b => { calls.push(b); const r = await reply(b); if (r instanceof Error) throw r; return r },
    lang: () => 'en', render() {}, mic: async () => {}, locate: async () => null,
    store: { get: k => kept.get(k) ?? null, set: (k, v) => kept.set(k, v) },
  }
  return { ctx, calls, kept }
}

test('reader handler: sample with no account; Notion text when keys are set', async () => {
  assert.deepEqual(await handle({ action: 'list' }, { env: {} }), sampleReader({ action: 'list' }))
  assert.match((await handle({ action: 'read', id: 'sample-reader' }, { env: {} })).text, /^Sample text/)
  const seen = []
  globalThis.fetch = async (url, opts = {}) => {
    seen.push(url)
    assert.equal(opts.headers['user-agent'], 'Gloz/0.1')
    if (url.endsWith('/query')) return json({ results: [{ id: 'p1', properties: { Name: { type: 'title', title: [{ plain_text: 'Essay' }] } } }] })
    const start = new URL(url).searchParams.get('start_cursor')
    return json(start ? { results: [{ type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'two' }] } }], has_more: false } : { results: [{ type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'One' }] } }, { type: 'image', image: {} }], has_more: true, next_cursor: 'c2' })
  }
  const env = { GLOZ_NOTION_TOKEN: 'test-token', GLOZ_NOTION_NOTES_DB: 'db1' }
  assert.deepEqual((await handle({ action: 'list' }, { env })).notes, [{ id: 'p1', title: 'Essay' }])
  assert.equal((await handle({ action: 'read', id: 'p1' }, { env })).text, 'One\ntwo')
  globalThis.fetch = async () => json({}, 404)
  assert.deepEqual(await handle({ action: 'list' }, { env }), { error: 'Notion: share the database with the Gloz connection' })
})

test('pages end at a space and lie end to end', () => {
  const t = 'one two three four five six seven eight nine ten '.repeat(20)
  const s = pageStarts(t, 60)
  assert.ok(s.length > 5)
  for (let i = 1; i < s.length; i++) assert.match(t[s[i] - 1], /\s/)
  assert.deepEqual(pageStarts('', 60), [0])
})

test('the app: down next page, up back, tap shows the page number, the place is kept', async () => {
  const kept = new Map()
  const { ctx } = fakeCtx(sampleReader, kept)
  let m = readerApp.make(ctx)
  await m.start(); await tick()
  const first = m.card()
  assert.equal(first.kind, 'message')
  assert.match(first.text, /^Sample text: On walking to work/)
  assert.match(first.hint, /^sample · page 1\/\d+ · down: next page · up: page back$/)
  const total = first.progress[1]
  m.input('next'); m.input('next')
  const third = m.card().text
  assert.match(m.card().hint, new RegExp(`^sample · page 3/${total} `))
  m.input('tap')
  assert.equal(m.card().text, third)
  m.input('prev'); m.input('next')
  assert.equal(m.card().text, third)
  // Opened again: the same page.
  m = readerApp.make(fakeCtx(sampleReader, kept).ctx)
  await m.start(); await tick()
  assert.equal(m.card().text, third)
  for (let i = 0; i < total; i++) m.input('next')
  assert.equal(m.card().text, 'End of text')
  m.input('prev')
  assert.deepEqual(m.card().progress, [total, total])
})

test('the app: a bigger text size gives more pages', async () => {
  const pagesAt = async size => {
    const kept = new Map([['gloz.settings', JSON.stringify({ size })]])
    const m = readerApp.make(fakeCtx(sampleReader, kept).ctx)
    await m.start(); await tick()
    return m.card().progress[1]
  }
  assert.ok(await pagesAt(6) > await pagesAt(1))
})

test('the app: no signal shows a line, tap tries again', async () => {
  let r = new Error('offline')
  const m = readerApp.make(fakeCtx(b => r instanceof Error ? r : sampleReader(b)).ctx)
  await m.start()
  assert.equal(m.card().text, 'No signal')
  r = null
  m.input('tap'); await tick()
  assert.equal(m.card().kind, 'message')
})

test('measure: 2,000,000 characters paged through intact, every character reachable', async () => {
  const words = ['bread', 'über', '这是测试', 'emoji🍞', 'a', 'paragraph.\n\n', 'longword'.repeat(40)]
  let big = ''
  for (let i = 0; big.length < 2_000_000; i++) big += words[i % words.length] + ' '
  big = big.slice(0, 2_000_000)
  const { ctx } = fakeCtx(b => b.action === 'list' ? { notes: [{ id: 'big', title: 'Big' }] } : { text: big })
  const m = readerApp.make(ctx)
  await m.start(); await tick()
  const total = m.card().progress[1]
  let shown = ''
  for (let p = 1; p <= total; p++) {
    const c = m.card()
    assert.equal(c.progress[0], p)
    shown += c.text
    m.input('next')
  }
  assert.equal(m.card().text, 'End of text')
  // Pages drop only the spaces at their edges: every other character is shown, in order.
  const strip = s => s.replace(/\s+/g, '')
  assert.ok(strip(shown) === strip(big), 'every character reachable')
  const starts = pageStarts(big, 132)
  assert.ok(starts.map((s, i) => big.slice(s, starts[i + 1] ?? big.length)).join('') === big, 'pages lie end to end')
  console.log(`# reader measure: ${big.length.toLocaleString('en')} characters, ${total.toLocaleString('en')} pages at size 3, all characters reached`)
})
