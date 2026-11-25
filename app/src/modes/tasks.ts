// Tasks: the wearer's open tasks from Google Tasks or a Notion database, one per line.
// Tap twice marks one done; hold, speak, let go, then tap adds one.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

export interface Task { id: string; title: string }

const SAMPLE_TASKS: Task[] = [
  { id: 'sample-1', title: 'Sample: book the dentist' },
  { id: 'sample-2', title: 'Sample: send the invoice to Marta' },
  { id: 'sample-3', title: 'Sample: buy bread and milk' },
  { id: 'sample-4', title: 'Sample: return the library books' },
]

const added: { id: string; title: string }[] = []
const done = new Set<string>()
// Tests start each case from the plain sample.
export function resetSampleTasks() { added.length = 0; done.clear() }
export function sampleTasks(body: any): any {
  const a = body?.action
  if (a === 'list') return { source: 'sample', tasks: [...added, ...SAMPLE_TASKS].filter(t => !done.has(t.id)) }
  if (a === 'done') { done.add(String(body.id ?? '')); return { ok: true, sample: true } }
  if (a === 'add') { const task = { id: `sample-new-${added.length + 1}`, title: String(body.title ?? '') }; added.unshift(task); return { ok: true, sample: true, task } }
  if (a === 'stt') return { text: '' }
  return { error: 'unknown action' }
}

type View = 'loading' | 'error' | 'list' | 'confirm' | 'heard' | 'saving'

export const tasksApp: AppEntry = {
  id: 'tasks',
  title: () => 'Tasks',
  make(ctx: ModeCtx): Mode {
    let view: View = 'loading'
    let tasks: Task[] = []
    let at = 0
    let draft = ''
    let line = ''
    let note = ''
    const show = (to: View) => { view = to; ctx.render() }
    const flash = (s: string) => { note = s; setTimeout(() => { if (note === s) { note = ''; ctx.render() } }, 3000) }

    async function load() {
      show('loading')
      try {
        const r = await ctx.call({ action: 'list' })
        if (r?.error) { line = r.error; return show('error') }
        tasks = r?.tasks ?? []
        at = Math.min(at, Math.max(0, tasks.length - 1))
        show('list')
      } catch { line = 'No signal'; show('error') }
    }

    async function done() {
      const t = tasks[at]
      show('saving')
      try {
        const r = await ctx.call({ action: 'done', id: t.id })
        if (r?.error) { flash(r.error); return show('list') }
        tasks = tasks.filter(x => x !== t)
        at = Math.min(at, Math.max(0, tasks.length - 1))
        flash(r?.sample ? '✓ Finished (sample)' : '✓ Finished')
      } catch { flash('No signal: not marked') }
      show('list')
    }

    async function add() {
      show('saving')
      try {
        const r = await ctx.call({ action: 'add', title: draft })
        if (r?.error) { line = r.error; return show('heard') }
        tasks = [r?.task ?? { id: '', title: draft }, ...tasks]
        at = 0
        draft = ''
        flash(r?.sample ? '✓ Added in Gloz (sample)' : '✓ Added')
        show('list')
      } catch { line = 'No signal: not added'; show('heard') }
    }

    function card(): Card {
      const lead = note ? `${note} · ` : ''
      switch (view) {
        case 'loading': return { kind: 'status', text: 'Loading tasks', hint: 'hold: add a task' }
        case 'error': return { kind: 'status', text: line, hint: 'tap: try again' }
        case 'list': return tasks.length
          ? { kind: 'status', text: tasks[at].title || 'Untitled', hint: `${lead}tap: done · down: next · up: earlier · hold: add a task`, progress: [at + 1, tasks.length] }
          : { kind: 'status', text: 'No open tasks', hint: `${lead}hold: add a task` }
        case 'confirm': return { kind: 'status', text: tasks[at].title || 'Untitled', hint: 'tap again to mark done · down: not yet' }
        case 'heard': return draft
          ? { kind: 'status', text: draft, hint: `${line ? line + ' · ' : ''}tap: add · hold: say again · down: discard` }
          : { kind: 'status', text: line || 'Nothing heard', hint: /speech/i.test(line) ? 'down: task list' : 'hold: speak again · down: task list' }
        case 'saving': return { kind: 'status', text: 'Saving', hint: 'wait' }
      }
    }

    return {
      id: 'tasks',
      card,
      start: load,
      say(text) { draft = text.trim(); line = ''; show('heard') },
      back() { if (view !== 'heard') return false; draft = ''; flash('Not added'); show('list'); return true },
      input(i) {
        if (view === 'error' && i === 'tap') return void load()
        if (view === 'heard') {
          if (i === 'tap' && draft) return void add()
          if (i === 'next' || i === 'prev') { draft = ''; line = ''; return show('list') }
          return
        }
        if (view === 'confirm') return i === 'tap' ? void done() : show('list')
        if (view === 'list' && tasks.length) {
          if (i === 'tap') return show('confirm')
          if (i === 'next') at = (at + 1) % tasks.length
          if (i === 'prev') at = (at - 1 + tasks.length) % tasks.length
          ctx.render()
        }
      },
    }
  },
}
