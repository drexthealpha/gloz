// Tasks on the server: open tasks from a Notion database (GLOZ_NOTION_TOKEN + GLOZ_NOTION_TASKS_DB; a
// checkbox or status column marks done) or Google Tasks (GLOZ_GOOGLE_CLIENT_ID, GLOZ_GOOGLE_CLIENT_SECRET,
// GLOZ_GOOGLE_REFRESH_TOKEN, with Tasks access); mark one done, add one, speech to text.
// With GLOZ_SAMPLE=1 or no account: sample tasks, changed for this run of the server only.
import { notion, schema, titleOf, titleProp, google, googleReady, heard, setupLine } from './notes.mjs'
import { sampleTasks } from '../../app/src/modes/tasks.ts'

export function tasksSource(env) {
  if (env.GLOZ_SAMPLE === '1') return 'sample'
  if (env.GLOZ_NOTION_TOKEN && env.GLOZ_NOTION_TASKS_DB) return 'notion'
  if (googleReady(env)) return 'google'
  return 'sample'
}

// The column that marks a task done: a checkbox, or a status with an option like "Done" or "Complete".
export function doneProp(s) {
  const props = Object.entries(s.properties ?? {})
  const box = props.find(([, p]) => p.type === 'checkbox')
  if (box) return { name: box[0], type: 'checkbox' }
  const st = props.find(([, p]) => p.type === 'status')
  const opt = st?.[1].status?.options?.find(o => /^(done|complete|completed|finished)$/i.test(o.name))
  return st && opt ? { name: st[0], type: 'status', value: opt.name } : null
}

const GT = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks'
const sample = { done: new Set(), added: [] }

async function list(env, src) {
  if (src === 'notion') {
    const db = env.GLOZ_NOTION_TASKS_DB
    const d = doneProp(await schema(env, db))
    const filter = d?.type === 'checkbox' ? { property: d.name, checkbox: { equals: false } } : d ? { property: d.name, status: { does_not_equal: d.value } } : undefined
    const r = await notion(env, `/databases/${db}/query`, 'POST', { page_size: 100, ...(filter ? { filter } : {}) })
    return { source: src, tasks: (r.results ?? []).map(p => ({ id: p.id, title: titleOf(p) })) }
  }
  if (src === 'google') {
    const j = await (await google(env, `${GT}?showCompleted=false&showHidden=false&maxResults=100`)).json()
    return { source: src, tasks: (j.items ?? []).filter(t => t.title).map(t => ({ id: t.id, title: t.title })) }
  }
  const base = sampleTasks({ action: 'list' })
  return { ...base, tasks: [...sample.added, ...base.tasks].filter(t => !sample.done.has(t.id)) }
}

async function done(env, src, id) {
  if (!id) return { error: 'No task chosen' }
  if (src === 'notion') {
    const d = doneProp(await schema(env, env.GLOZ_NOTION_TASKS_DB))
    if (!d) return { error: 'Notion: add a Done checkbox to the tasks database' }
    await notion(env, `/pages/${id}`, 'PATCH', { properties: { [d.name]: d.type === 'checkbox' ? { checkbox: true } : { status: { name: d.value } } } })
    return { ok: true }
  }
  if (src === 'google') {
    await google(env, `${GT}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) })
    return { ok: true }
  }
  sample.done.add(id)
  return { ok: true, sample: true }
}

async function add(env, src, title) {
  title = String(title ?? '').trim()
  if (!title) return { error: 'Nothing to add' }
  if (src === 'notion') {
    const db = env.GLOZ_NOTION_TASKS_DB
    const p = await notion(env, '/pages', 'POST', { parent: { database_id: db }, properties: { [titleProp(await schema(env, db))]: { title: [{ text: { content: title.slice(0, 2000) } }] } } })
    return { ok: true, task: { id: p.id, title } }
  }
  if (src === 'google') {
    const t = await (await google(env, GT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) })).json()
    return { ok: true, task: { id: t.id, title: t.title ?? title } }
  }
  const task = { id: `sample-added-${sample.added.length + 1}`, title }
  sample.added.unshift(task)
  return { ok: true, sample: true, task }
}

export async function handle(body, { env = process.env, stt } = {}) {
  const src = tasksSource(env)
  try {
    const a = body?.action
    if (a === 'list') return await list(env, src)
    if (a === 'done') return await done(env, src, String(body.id ?? ''))
    if (a === 'add') return await add(env, src, body.title)
    if (a === 'stt') return await heard(body, stt)
    return { error: 'unknown action' }
  } catch (e) {
    const line = setupLine(e)
    if (line) return { error: line }
    throw e
  }
}
