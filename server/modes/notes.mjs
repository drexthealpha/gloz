// Notes on the server: list, read and add notes in Notion (GLOZ_NOTION_TOKEN + GLOZ_NOTION_NOTES_DB)
// or Google Docs (GLOZ_GOOGLE_CLIENT_ID, GLOZ_GOOGLE_CLIENT_SECRET, GLOZ_GOOGLE_REFRESH_TOKEN; optional
// GLOZ_GOOGLE_NOTES_FOLDER), and speech to text with the server's own engine.
// With GLOZ_SAMPLE=1 or no account: sample notes. Reader and Teleprompter use the same documents.
import { transcribe } from '../stt.mjs'
import { sampleNotes } from '../../app/src/modes/notes.ts'

const UA = 'Gloz/0.1'
const NOTION = 'https://api.notion.com/v1'

export function docsSource(env) {
  if (env.GLOZ_SAMPLE === '1') return 'sample'
  if (env.GLOZ_NOTION_TOKEN && env.GLOZ_NOTION_NOTES_DB) return 'notion'
  if (googleReady(env)) return 'google'
  return 'sample'
}

export const googleReady = env => Boolean(env.GLOZ_GOOGLE_CLIENT_ID && env.GLOZ_GOOGLE_CLIENT_SECRET && env.GLOZ_GOOGLE_REFRESH_TOKEN)

async function call(url, opts, who) {
  const r = await fetch(url, { ...opts, headers: { 'user-agent': UA, ...opts?.headers } })
  if (!r.ok) throw Object.assign(new Error(`${who} ${r.status}`), { status: r.status, who })
  return r
}

// --- Notion -------------------------------------------------------------------------------

export function notion(env, path, method = 'GET', body) {
  return call(NOTION + path, { method, headers: { authorization: `Bearer ${env.GLOZ_NOTION_TOKEN}`, 'notion-version': '2022-06-28', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }, 'notion').then(r => r.json())
}

const plain = rt => (rt ?? []).map(t => t.plain_text ?? t.text?.content ?? '').join('')
export const titleOf = page => plain(Object.values(page.properties ?? {}).find(p => p.type === 'title')?.title)

const schemas = new Map()
export async function schema(env, db) {
  if (!schemas.has(db)) schemas.set(db, await notion(env, `/databases/${db}`))
  return schemas.get(db)
}
export const titleProp = s => Object.entries(s.properties ?? {}).find(([, p]) => p.type === 'title')?.[0] ?? 'Name'

// Notion holds at most 2000 characters in one text piece and 100 pieces in one block.
// A piece never ends inside a surrogate pair, so no character is split.
function pieces(s, n) {
  const out = []
  for (let i = 0; i < s.length;) {
    let e = Math.min(s.length, i + n)
    const c = s.charCodeAt(e - 1)
    if (e < s.length && c >= 0xd800 && c <= 0xdbff) e--
    out.push(s.slice(i, e))
    i = e
  }
  return out
}

// One paragraph block per line of the note, so reading it back gives the same text.
export function toBlocks(text) {
  const blocks = []
  const para = rich => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: rich } })
  for (const line of text.split('\n')) {
    const rich = pieces(line, 2000).map(content => ({ type: 'text', text: { content } }))
    if (!rich.length) blocks.push(para([]))
    for (let i = 0; i < rich.length; i += 100) blocks.push(para(rich.slice(i, i + 100)))
  }
  return blocks
}

// Notion takes at most 100 blocks and 500 KB in one request.
function batches(blocks) {
  const out = []
  let cur = [], chars = 0
  for (const b of blocks) {
    const n = b.paragraph.rich_text.reduce((k, t) => k + t.text.content.length, 0)
    if (cur.length && (cur.length >= 100 || chars + n > 100_000)) { out.push(cur); cur = []; chars = 0 }
    cur.push(b); chars += n
  }
  if (cur.length) out.push(cur)
  return out
}

export async function notionText(env, id) {
  const lines = []
  let cursor
  do {
    const r = await notion(env, `/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`)
    for (const b of r.results ?? []) { const v = b[b.type]; if (v && 'rich_text' in v) lines.push(plain(v.rich_text)) }
    cursor = r.has_more ? r.next_cursor : undefined
  } while (cursor)
  return lines.join('\n')
}

// --- Google ------------------------------------------------------------------------------

let gcache = { token: '', until: 0 }
export async function googleToken(env) {
  if (gcache.token && Date.now() < gcache.until) return gcache.token
  const r = await call('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GLOZ_GOOGLE_CLIENT_ID, client_secret: env.GLOZ_GOOGLE_CLIENT_SECRET, refresh_token: env.GLOZ_GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }) }, 'google')
  const j = await r.json()
  gcache = { token: j.access_token, until: Date.now() + ((j.expires_in ?? 3600) - 60) * 1000 }
  return gcache.token
}
export function forgetGoogleToken() { gcache = { token: '', until: 0 } }

export async function google(env, url, opts = {}) {
  const token = await googleToken(env)
  return call(url, { ...opts, headers: { authorization: `Bearer ${token}`, ...opts.headers } }, 'google')
}

// Google Docs holds up to 1.02 million characters in one document.
export const GOOGLE_DOC_MAX = 1_020_000

// --- documents, for Notes, Reader and Teleprompter ---------------------------------------------

export async function listDocs(env) {
  const src = docsSource(env)
  if (src === 'notion') {
    const r = await notion(env, `/databases/${env.GLOZ_NOTION_NOTES_DB}/query`, 'POST', { page_size: 50, sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }] })
    return { source: src, notes: (r.results ?? []).map(p => ({ id: p.id, title: titleOf(p) })) }
  }
  if (src === 'google') {
    const folder = env.GLOZ_GOOGLE_NOTES_FOLDER
    const q = `mimeType='application/vnd.google-apps.document' and trashed=false${folder ? ` and '${folder}' in parents` : ''}`
    const r = await google(env, `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, orderBy: 'modifiedTime desc', pageSize: '50', fields: 'files(id,name)' })}`)
    const j = await r.json()
    return { source: src, notes: (j.files ?? []).map(f => ({ id: f.id, title: f.name })) }
  }
  return sampleNotes({ action: 'list' })
}

const added = new Map()   // notes added while no account is set up: kept for this run of the server only

export async function readDoc(env, id) {
  const src = docsSource(env)
  if (src === 'notion') return { text: await notionText(env, id) }
  if (src === 'google') {
    const r = await google(env, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/export?mimeType=text/plain`)
    // Google adds a byte order mark and Windows line ends to plain text exports.
    return { text: (await r.text()).replace(/^﻿/, '').replace(/\r\n/g, '\n') }
  }
  if (added.has(id)) return { text: added.get(id) }
  return sampleNotes({ action: 'read', id })
}

export async function addDoc(env, text) {
  text = String(text ?? '').replace(/\r\n?/g, '\n')
  if (!text.trim()) return { error: 'Nothing to save' }
  const title = text.trim().split('\n')[0].slice(0, 60)
  const src = docsSource(env)
  if (src === 'notion') {
    const db = env.GLOZ_NOTION_NOTES_DB
    const [first = [], ...rest] = batches(toBlocks(text))
    const page = await notion(env, '/pages', 'POST', { parent: { database_id: db }, properties: { [titleProp(await schema(env, db))]: { title: [{ text: { content: title } }] } }, children: first })
    for (const b of rest) await notion(env, `/blocks/${page.id}/children`, 'PATCH', { children: b })
    return { ok: true, id: page.id }
  }
  if (src === 'google') {
    if (text.length > GOOGLE_DOC_MAX) return { error: 'Too long for one Google Doc' }
    const folder = env.GLOZ_GOOGLE_NOTES_FOLDER
    const meta = { name: title, mimeType: 'application/vnd.google-apps.document', ...(folder ? { parents: [folder] } : {}) }
    const b = 'gloz' + Date.now()
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n--${b}--`
    const r = await google(env, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${b}` }, body })
    return { ok: true, id: (await r.json()).id }
  }
  const id = `sample-added-${added.size + 1}`
  added.set(id, text)
  return { ok: true, sample: true, id }
}

// Speech from the glasses (base64 of 16 kHz 16-bit mono PCM) to text, with the server's engine.
export async function heard(body, stt = transcribe) {
  if (!body.pcm) return { text: '' }
  try {
    const r = await stt(Buffer.from(String(body.pcm), 'base64'), body.lang || 'en')
    return { text: r.text ?? '', ms: r.ms }
  } catch { return { error: 'No speech engine on the server' } }
}

// A refused key or missing access becomes a line the wearer can act on; no signal stays an error.
export function setupLine(e) {
  if (e.who === 'notion' && e.status === 401) return 'Notion key refused: check GLOZ_NOTION_TOKEN'
  if (e.who === 'notion' && (e.status === 403 || e.status === 404)) return 'Notion: share the database with the Gloz connection'
  if (e.who === 'google' && (e.status === 400 || e.status === 401 || e.status === 403)) { forgetGoogleToken(); return 'Google: sign in again with Docs and Tasks access' }
  if (e.status === 429) return 'Too many requests: try again in a minute'
  return null
}

export async function handle(body, { env = process.env, stt } = {}) {
  try {
    const a = body?.action
    if (a === 'list') return await listDocs(env)
    if (a === 'read') return await readDoc(env, String(body.id ?? ''))
    if (a === 'add') return await addDoc(env, body.text)
    if (a === 'stt') return await heard(body, stt)
    return { error: 'unknown action' }
  } catch (e) {
    const line = setupLine(e)
    if (line) return { error: line }
    throw e
  }
}
