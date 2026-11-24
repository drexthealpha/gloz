// Notes: the wearer's notes from Notion or Google Docs, read one at a time;
// a new note by voice: hold, speak, let go, then tap to save.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

// --- shared by the apps that list documents or listen -------------------------------------

export interface Doc { id: string; title: string }

// Up to 40 s of speech per hold (16 kHz, 16-bit mono), which keeps one request under the server's 2 MB.
const MAX_PCM = 40 * 32000

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

// Hold starts the microphone, release stops it; the speech goes to the app's server route,
// which turns it into text with the server's speech engine.
export function voice(ctx: ModeCtx) {
  let parts: Uint8Array[] = []
  let bytes = 0
  let on = false
  return {
    get on() { return on },
    start() { parts = []; bytes = 0; on = true; ctx.mic(true).catch(() => {}) },
    add(p: Uint8Array) { if (on && bytes < MAX_PCM) { parts.push(p); bytes += p.length } },
    // The words heard, '' for nothing; an error line when the server cannot turn speech into text.
    async stop(): Promise<{ text: string; error?: string }> {
      on = false
      ctx.mic(false).catch(() => {})
      if (bytes < 3200) return { text: '' }
      try {
        const r = await ctx.call({ action: 'stt', pcm: b64(joinPcm(parts)), lang: ctx.lang() })
        return r?.error ? { text: '', error: r.error } : { text: String(r?.text ?? '').trim() }
      } catch { return { text: '', error: 'No signal' } }
    },
  }
}

// --- sample data, also served by the server with no account set up --------------------------

const SAMPLE_NOTES: Record<string, { title: string; text: string }> = {
  'sample-1': { title: 'Sample: call with the printer', text: 'Sample: call with the printer\nProofs arrive on Thursday. Check the colour of the cover against the first run. Ask for 200 copies, not 250.' },
  'sample-2': { title: 'Sample: ideas for the garden', text: 'Sample: ideas for the garden\nMove the bench to the shade by the wall. Plant beans along the fence in April. Fix the tap before the summer.' },
  'sample-3': { title: 'Sample: books to read', text: 'Sample: books to read\nA history of the bicycle. The short stories from the library list. Anything on bread at home.' },
}

export function sampleNotes(body: any): any {
  const a = body?.action
  if (a === 'list') return { source: 'sample', notes: Object.entries(SAMPLE_NOTES).map(([id, n]) => ({ id, title: n.title })) }
  if (a === 'read') { const n = SAMPLE_NOTES[body.id]; return n ? { text: n.text } : { error: 'Note not found' } }
  if (a === 'add') return { ok: true, sample: true, id: 'sample-new' }
  if (a === 'stt') return { text: '' }
  return { error: 'unknown action' }
}

// --- the app --------------------------------------------------------------------------------

type View = 'loading' | 'error' | 'list' | 'read' | 'listening' | 'thinking' | 'heard' | 'saving' | 'note'

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
    const v = voice(ctx)
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
        line = r?.sample ? 'Saved here only: no notes account set up' : 'Saved'
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
          ? { kind: 'status', text: notes[at].title || 'Untitled', hint: `tap: read · down: next · up: back · ${hold}`, progress: [at + 1, notes.length] }
          : { kind: 'status', text: sample ? 'No notes (sample)' : 'No notes yet', hint: hold }
        case 'read': return { kind: 'message', text: text || '(empty note)', hint: 'tap: list · down: next note · up: back' }
        case 'listening': return { kind: 'status', text: 'Listening', hint: 'release: stop' }
        case 'thinking': return { kind: 'status', text: 'Writing down', hint: 'wait' }
        case 'heard': return draft
          ? { kind: 'message', text: draft, hint: `${line ? line + ' · ' : ''}tap: save · hold: add more · down: discard` }
          : { kind: 'status', text: line || 'Nothing heard', hint: 'hold: speak again · down: back' }
        case 'saving': return { kind: 'status', text: 'Saving', hint: 'wait' }
        case 'note': return { kind: 'status', text: line, hint: hold }
      }
    }

    return {
      id: 'notes',
      card,
      start: load,
      stop: () => { if (v.on) ctx.mic(false).catch(() => {}) },
      audio: p => v.add(p),
      input(i) {
        if (view === 'listening') {
          if (i !== 'release') return
          show('thinking')
          void v.stop().then(r => { line = r.error ?? ''; draft = (draft + ' ' + r.text).trim(); show('heard') })
          return
        }
        if (i === 'hold' && view !== 'saving' && view !== 'thinking') { if (view !== 'heard') draft = ''; line = ''; v.start(); return show('listening') }
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
