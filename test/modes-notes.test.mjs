// Notes: the app's presses and the server handler, with no keys and no network (fetch is replaced).
// Also measures the longest note saved and read back intact by the handler.
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { notesApp, sampleNotes } from '../app/src/modes/notes.ts'
import { handle, toBlocks, forgetGoogleToken, GOOGLE_DOC_MAX } from '../server/modes/notes.mjs'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch; forgetGoogleToken() })
const tick = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)) }

function fakeCtx(reply) {
  const calls = [], mics = [], kept = new Map()
  const ctx = {
    call: async b => { calls.push(b); const r = await reply(b); if (r instanceof Error) throw r; return r },
    lang: () => 'en', render() {}, mic: async on => { mics.push(on) }, locate: async () => null,
    store: { get: k => kept.get(k) ?? null, set: (k, v) => kept.set(k, v) },
  }
  return { ctx, calls, mics, kept }
}

const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })

// A stand-in for the Notion API that keeps pages and refuses what Notion refuses:
// more than 100 blocks or 500 KB in a request, more than 100 text pieces in a block, more than 2000 characters in a piece.
function notionMock() {
  const pages = new Map()
  let n = 0
  const check = (body, children) => {
    if (Buffer.byteLength(body) > 500_000) return 'payload too large'
    if (children.length > 100) return 'too many blocks'
    for (const b of children) {
      const rt = b[b.type].rich_text
      if (rt.length > 100) return 'too many pieces'
      if (rt.some(t => t.text.content.length > 2000)) return 'piece too long'
    }
    return null
  }
  const fetch = async (url, opts = {}) => {
    const u = new URL(url)
    assert.equal(u.host, 'api.notion.com')
    assert.equal(opts.headers['user-agent'], 'Gloz/0.1')
    const body = opts.body ? JSON.parse(opts.body) : null
    const m = opts.method ?? 'GET'
    let x
    if (m === 'GET' && (x = u.pathname.match(/^\/v1\/databases\/([^/]+)$/))) return json({ properties: { Name: { type: 'title' }, Done: { type: 'checkbox' } } })
    if (m === 'POST' && u.pathname.endsWith('/query')) return json({ results: [...pages.entries()].map(([id, p]) => ({ id, properties: { Name: { type: 'title', title: [{ plain_text: p.title }] } } })) })
    if (m === 'POST' && u.pathname === '/v1/pages') {
      const err = check(opts.body, body.children ?? [])
      if (err) return json({ message: err }, 400)
      const id = `page-${++n}`
      pages.set(id, { title: body.properties.Name.title[0].text.content, blocks: [...(body.children ?? [])] })
      return json({ id })
    }
    if ((x = u.pathname.match(/^\/v1\/blocks\/([^/]+)\/children$/))) {
      const p = pages.get(x[1])
      if (!p) return json({ message: 'not found' }, 404)
      if (m === 'PATCH') { const err = check(opts.body, body.children); if (err) return json({ message: err }, 400); p.blocks.push(...body.children); return json({}) }
      const size = Math.min(100, Number(u.searchParams.get('page_size')) || 100)
      const start = Number(u.searchParams.get('start_cursor') || 0)
      const results = p.blocks.slice(start, start + size).map(b => ({ type: b.type, [b.type]: { rich_text: b[b.type].rich_text.map(t => ({ plain_text: t.text.content })) } }))
      const more = start + size < p.blocks.length
      return json({ results, has_more: more, next_cursor: more ? String(start + size) : null })
    }
    return json({ message: 'unexpected ' + m + ' ' + u.pathname }, 500)
  }
  return { fetch, pages }
}

// A stand-in for Google: token, Drive list, plain text export (with a byte order mark and \r\n, as Google sends) and upload.
function googleMock() {
  const docs = new Map()
  let n = 0
  const fetch = async (url, opts = {}) => {
    const u = new URL(url)
    if (u.host === 'oauth2.googleapis.com') return json({ access_token: 'test-access', expires_in: 3600 })
    assert.equal(opts.headers.authorization, 'Bearer test-access')
    if (u.pathname === '/drive/v3/files') return json({ files: [...docs.entries()].map(([id, d]) => ({ id, name: d.name })) })
    let x
    if ((x = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/export$/))) return new Response('﻿' + docs.get(x[1]).text.replace(/\n/g, '\r\n'))
    if (u.pathname === '/upload/drive/v3/files') {
      const b = opts.headers['content-type'].split('boundary=')[1]
      const [, meta, text] = opts.body.split(`--${b}\r\n`).map(p => p.slice(p.indexOf('\r\n\r\n') + 4).replace(/\r\n(--.*--)?$/, ''))
      const id = `doc-${++n}`
      docs.set(id, { name: JSON.parse(meta).name, text })
      return json({ id })
    }
    return json({}, 500)
  }
  return { fetch, docs }
}

const NOTION = { GLOZ_NOTION_TOKEN: 'test-token', GLOZ_NOTION_NOTES_DB: 'db1' }
const GOOGLE = { GLOZ_GOOGLE_CLIENT_ID: 'id', GLOZ_GOOGLE_CLIENT_SECRET: 'secret', GLOZ_GOOGLE_REFRESH_TOKEN: 'refresh' }

// Long text with paragraphs, accents, Chinese and emoji (two UTF-16 units each), so no character may be split.
function longText(chars) {
  const parts = ['Ein Absatz über Brot. ', '这是一个测试。', 'Emoji 🍞🥛 here. ', 'Plain words for the reader to see. ', '\n', '\n\n']
  let s = '', i = 0
  while (s.length < chars) s += parts[i++ % parts.length] + (i % 37 === 0 ? 'x'.repeat(3000) : '')
  return s.slice(0, chars - 1) + '.'
}

test('notes with no account: sample notes, and an added note reads back', async () => {
  const list = await handle({ action: 'list' }, { env: {} })
  assert.equal(list.source, 'sample')
  assert.deepEqual(list, sampleNotes({ action: 'list' }))
  const r = await handle({ action: 'add', text: 'Buy stamps' }, { env: {} })
  assert.equal(r.sample, true)
  assert.equal((await handle({ action: 'read', id: r.id }, { env: {} })).text, 'Buy stamps')
})

test('speech goes to the server engine; no engine gives a clear line', async () => {
  const pcm = Buffer.alloc(6400).toString('base64')
  assert.deepEqual(await handle({ action: 'stt', pcm }, { env: {}, stt: async (b, lang) => ({ text: `${b.length} ${lang}`, ms: 5 }) }), { text: '6400 en', ms: 5 })
  assert.deepEqual(await handle({ action: 'stt', pcm }, { env: {}, stt: async () => { throw new Error('none') } }), { error: 'No speech engine on the server' })
})

test('Notion: add a note, list it, read it back; a refused key is a setup line', async () => {
  const n = notionMock()
  globalThis.fetch = n.fetch
  const add = await handle({ action: 'add', text: 'Call Ana\nabout the proofs' }, { env: NOTION })
  assert.equal(add.ok, true)
  const list = await handle({ action: 'list' }, { env: NOTION })
  assert.deepEqual(list.notes, [{ id: add.id, title: 'Call Ana' }])
  assert.equal((await handle({ action: 'read', id: add.id }, { env: NOTION })).text, 'Call Ana\nabout the proofs')
  globalThis.fetch = async () => json({}, 401)
  assert.deepEqual(await handle({ action: 'list' }, { env: NOTION }), { error: 'Notion key refused: check GLOZ_NOTION_TOKEN' })
})

test('Google Docs: add, list and read back; the export marks are removed', async () => {
  const g = googleMock()
  globalThis.fetch = g.fetch
  const add = await handle({ action: 'add', text: 'Garden\nfix the tap' }, { env: GOOGLE })
  assert.equal((await handle({ action: 'list' }, { env: GOOGLE })).notes[0].title, 'Garden')
  assert.equal((await handle({ action: 'read', id: add.id }, { env: GOOGLE })).text, 'Garden\nfix the tap')
  assert.deepEqual(await handle({ action: 'add', text: 'x'.repeat(GOOGLE_DOC_MAX + 1) }, { env: GOOGLE }), { error: 'Too long for one Google Doc' })
})

test('measure: longest note saved and read back intact by the handler', async () => {
  const n = notionMock()
  globalThis.fetch = n.fetch
  const big = longText(2_000_000)
  assert.equal(big.length, 2_000_000)
  const add = await handle({ action: 'add', text: big }, { env: NOTION })
  assert.equal(add.ok, true)
  const back = (await handle({ action: 'read', id: add.id }, { env: NOTION })).text
  assert.equal(back.length, big.length)
  assert.ok(back === big, 'Notion: 2,000,000 characters back intact')
  forgetGoogleToken()
  const g = googleMock()
  globalThis.fetch = g.fetch
  const gbig = longText(GOOGLE_DOC_MAX)
  const gadd = await handle({ action: 'add', text: gbig }, { env: GOOGLE })
  assert.ok((await handle({ action: 'read', id: gadd.id }, { env: GOOGLE })).text === gbig, 'Google: 1,020,000 characters back intact')
  console.log(`# notes measure: Notion ${back.length.toLocaleString('en')} characters, ${n.pages.get(add.id).blocks.length} blocks, intact; Google Docs ${gbig.length.toLocaleString('en')} intact`)
})

test('blocks keep every line, blank lines too', () => {
  const b = toBlocks('a\n\nb')
  assert.equal(b.length, 3)
  assert.deepEqual(b[1].paragraph.rich_text, [])
})

test('the app: list, read, voice note, save', async () => {
  const { ctx, calls, mics } = fakeCtx(b => b.action === 'stt' ? { text: 'call the printer' } : sampleNotes(b))
  const m = notesApp.make(ctx)
  await m.start()
  assert.equal(m.card().text, 'Sample: call with the printer')
  assert.match(m.card().hint, /^tap: read · down: next · up: earlier · hold: speak a note$/)
  m.input('next'); assert.equal(m.card().text, 'Sample: ideas for the garden')
  m.input('prev'); m.input('prev'); assert.equal(m.card().text, 'Sample: books to read')
  m.input('tap'); await tick()
  assert.equal(m.card().kind, 'message')
  assert.match(m.card().text, /bicycle/)
  m.input('tap'); assert.equal(m.card().text, 'Sample: books to read')
  m.say('call the printer'); await tick()
  assert.equal(m.card().text, 'call the printer')
  assert.match(m.card().hint, /tap: save/)
  m.input('tap'); await tick()
  assert.deepEqual(calls.at(-1), { action: 'add', text: 'call the printer' })
  assert.equal(m.card().text, '✓ Saved (sample)')
})

test('the app: no signal and setup lines show, never a blank', async () => {
  let r = new Error('offline')
  const { ctx } = fakeCtx(() => r)
  const m = notesApp.make(ctx)
  await m.start()
  assert.equal(m.card().text, 'No signal')
  r = { error: 'Notion key refused: check GLOZ_NOTION_TOKEN' }
  m.input('tap'); await tick()
  assert.equal(m.card().text, 'Notion key refused: check GLOZ_NOTION_TOKEN')
  for (const c of [m.card()]) assert.ok(c.hint)
})
