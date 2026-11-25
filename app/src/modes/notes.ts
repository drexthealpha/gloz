// Notes: the wearer's notes from Notion or Google Docs, read one at a time;
// a new note by voice: hold, speak, let go, then tap to save.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

// --- shared by the apps that list documents or listen -------------------------------------

export interface Doc { id: string; title: string }


export function joinPcm(parts: Uint8Array[]): Uint8Array {
  const all = new Uint8Array(parts.reduce((n, c) => n + c.length, 0))
  let o = 0
  for (const c of parts) { all.set(c, o); o += c.length }
  return all
}

export function b64(u: Uint8Array): string {
  let s = ''
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(s)
}


// --- sample data, also served by the server with no account set up --------------------------

const SAMPLE_NOTES: Record<string, { title: string; text: string }> = {
  'sample-1': { title: 'Sample: call with the printer', text: 'Sample: call with the printer\nProofs arrive on Thursday. Check the colour of the cover against the first run. Ask for 200 copies, not 250.' },
  'sample-2': { title: 'Sample: ideas for the garden', text: 'Sample: ideas for the garden\nMove the bench to the shade by the wall. Plant beans along the fence in April. Fix the tap before the summer.' },
  'sample-3': { title: 'Sample: books to read', text: 'Sample: books to read\nA history of the bicycle. The short stories from the library list. Anything on bread at home.' },
}

const savedNotes: { id: string; title: string; text: string }[] = []
// Tests start each case from the plain sample.
export function resetSampleNotes() { savedNotes.length = 0 }
export function sampleNotes(body: any): any {
  const a = body?.action
  if (a === 'list') return { source: 'sample', notes: [...savedNotes.map(n => ({ id: n.id, title: n.title })), ...Object.entries(SAMPLE_NOTES).map(([id, n]) => ({ id, title: n.title }))] }
  if (a === 'read') { const n = SAMPLE_NOTES[body.id] ?? savedNotes.find(x => x.id === body.id); return n ? { text: n.text } : { error: 'Note not found' } }
  if (a === 'add') { const text = String(body.text ?? ''); const n = { id: `sample-new-${savedNotes.length + 1}`, title: text.slice(0, 40), text }; savedNotes.unshift(n); return { ok: true, sample: true, id: n.id } }
  if (a === 'stt') return { text: '' }
  return { error: 'unknown action' }
}

// --- the app --------------------------------------------------------------------------------

type View = 'loading' | 'error' | 'list' | 'read' | 'heard' | 'saving' | 'note'

export const notesApp: AppEntry = {
  id: 'notes',
  title: () => 'Notes',
  make(ctx: ModeCtx): Mode {
    let view: View = 'loading'
    let notes: Doc[] = []
    let at = 0
    let text = ''
    let draft = ''
    let line = ''
    let sample = false
    const show = (to: View) => { view = to; ctx.render() }

    async function load() {
      show('loading')
      try {
        const r = await ctx.call({ action: 'list' })
        if (r?.error) { line = r.error; return show('error') }
        notes = r?.notes ?? []
        sample = r?.source === 'sample'
        at = Math.min(at, Math.max(0, notes.length - 1))
        show('list')
      } catch { line = 'No signal'; show('error') }
    }

    async function open(i: number) {
      at = i
      text = ''
      show('loading')
      try {
        const r = await ctx.call({ action: 'read', id: notes[i].id })
        if (r?.error) { line = r.error; return show('error') }
        text = String(r?.text ?? '')
        show('read')
      } catch { line = 'No signal'; show('error') }
    }

    async function save() {
      show('saving')
      try {
        const r = await ctx.call({ action: 'add', text: draft })
        if (r?.error) { line = r.error; return show('error') }
        line = r?.sample ? 'Saved in Gloz (no Notion or Google Docs set up)' : 'Saved'
        draft = ''
        show('note')
        setTimeout(() => { if (view === 'note') void load() }, 2500)
      } catch { line = 'No signal: not saved'; show('heard') }
    }

    function card(): Card {
      const hold = 'hold: speak a note'
      switch (view) {
        case 'loading': return { kind: 'status', text: 'Loading notes', hint: hold }
        case 'error': return { kind: 'status', text: line, hint: `tap: try again · ${hold}` }
        case 'list': return notes.length
          ? { kind: 'status', text: notes[at].title || 'Untitled', hint: `tap: read · down: next · up: earlier · ${hold}`, progress: [at + 1, notes.length] }
          : { kind: 'status', text: sample ? 'No notes (sample)' : 'No notes yet', hint: hold }
        case 'read': return { kind: 'message', text: text || '(empty note)', hint: 'tap: all notes · down: next note' }
        case 'heard': return draft
          ? { kind: 'message', text: draft, hint: `${line ? line + ' · ' : ''}tap: save · hold: add more · down: discard` }
          : { kind: 'status', text: line || 'Nothing heard', hint: /speech/i.test(line) ? 'down: notes list' : 'hold: speak again · down: notes list' }
        case 'saving': return { kind: 'status', text: 'Saving', hint: 'wait' }
        case 'note': return { kind: 'status', text: line, hint: hold }
      }
    }

    return {
      id: 'notes',
      card,
      start: load,
      // Words said add to a note being written; a tap saves it.
      say(text) { draft = (view === 'heard' ? `${draft} ${text}` : text).trim(); line = ''; show('heard') },
      back() { if (view !== 'heard') return false; draft = ''; line = 'Not saved'; show('note'); setTimeout(() => { if (view === 'note') void load() }, 2500); return true },
      input(i) {
        if (view === 'heard') {
          if (i === 'tap' && draft) return void save()
          if (i === 'next' || i === 'prev') { draft = ''; line = ''; return void load() }
          return
        }
        if (view === 'error' && i === 'tap') return void load()
        if (view === 'list' && notes.length) {
          if (i === 'next') at = (at + 1) % notes.length
          if (i === 'prev') at = (at - 1 + notes.length) % notes.length
          if (i === 'tap') return void open(at)
          return ctx.render()
        }
        if (view === 'read') {
          if (i === 'tap' || i === 'prev') return show('list')
          if (i === 'next') return at + 1 < notes.length ? void open(at + 1) : show('list')
        }
      },
    }
  },
}
