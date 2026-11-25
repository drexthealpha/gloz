// Teleprompter: the wearer's script one line at a time. It follows the wearer's voice: every 1.5 s the
// last 3 s of speech go to the server, which says where in the script the wearer is.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'
import { b64, joinPcm, type Doc } from './notes.ts'
import { perLine } from './reader.ts'

const SAMPLE_SCRIPT = `Sample script. Good morning, and thank you for coming. Today I want to talk about three small changes that made our team faster this year. The first change was simple: we stopped holding meetings on Wednesday. That gave everyone one full day to work without a break. The second change was to write down every decision in one shared place, with the date and the name of the person who made it. Questions that used to take a week to answer now take a minute. The third change was the hardest. We agreed to finish one piece of work before starting the next. At first it felt slow. After two months we were shipping twice as often. None of this needed new tools or a bigger budget. It needed us to agree, and then to keep to it. Thank you. I am happy to take questions.`

export function samplePrompter(body: any): any {
  if (body?.action === 'list') return { source: 'sample', notes: [{ id: 'sample-script', title: 'Sample: team talk' }] }
  if (body?.action === 'read') return body.id === 'sample-script' ? { text: SAMPLE_SCRIPT } : { error: 'Script not found' }
  // With no server there is no speech engine: the place stays where it is.
  if (body?.action === 'follow') return { at: null, heard: '' }
  return { error: 'unknown action' }
}

// Script lines: words grouped up to about one display line at the wearer's size.
export function scriptLines(words: string[], chars: number): number[] {
  const starts: number[] = []
  let len = 0
  words.forEach((w, i) => {
    if (!starts.length || len + 1 + w.length > chars) { starts.push(i); len = w.length } else len += 1 + w.length
  })
  return starts.length ? starts : [0]
}

const RATE = 32000             // bytes a second: 16 kHz, 16-bit mono
const HEAR = 3 * RATE          // each request carries the last 3 s
const EVERY = 1.5 * RATE       // and goes out every 1.5 s of new sound

function loud(parts: Uint8Array[]): boolean {
  let sum = 0, n = 0
  for (const p of parts) { const v = new DataView(p.buffer, p.byteOffset, p.byteLength); for (let i = 0; i + 1 < p.length; i += 2) { const x = v.getInt16(i, true); sum += x * x; n++ } }
  return n > 0 && Math.sqrt(sum / n) > 250
}

type View = 'loading' | 'error' | 'pick' | 'script'

export const prompterApp: AppEntry = {
  id: 'prompter',
  title: () => 'Teleprompter',
  make(ctx: ModeCtx): Mode {
    let view: View = 'loading'
    let docs: Doc[] = []
    let pick = 0
    let words: string[] = []
    let starts: number[] = [0]
    let at = 0                 // index of the next word to say
    let following = false
    let sampleVoice = false   // the demo follows a sample voice, and says so
    let busy = false
    let note = ''
    let line = ''
    let parts: Uint8Array[] = []
    let bytes = 0
    let fresh = 0
    let moved = 0              // presses by hand: a reply asked for before one is dropped
    const show = (to: View) => { view = to; ctx.render() }
    const lineOf = (w: number) => { let l = 0; while (l + 1 < starts.length && starts[l + 1] <= w) l++; return l }

    let replies = 0   // answers from the server while following
    function follow(on: boolean) {
      following = on
      parts = []; bytes = 0; fresh = 0
      ctx.mic(on).catch(() => {})
      if (on) { const was = replies; setTimeout(() => { if (following && replies === was && !note) { note = 'No voice heard yet'; if (view === 'script') ctx.render() } }, 5000) }
    }

    async function load() {
      show('loading')
      try {
        const r = await ctx.call({ action: 'list' })
        if (r?.error) { line = r.error; return show('error') }
        docs = r?.notes ?? []
        if (!docs.length) { line = 'No scripts yet'; return show('error') }
        if (docs.length === 1) return void open(docs[0])
        show('pick')
      } catch { line = 'No signal'; show('error') }
    }

    async function open(d: Doc) {
      show('loading')
      try {
        const r = await ctx.call({ action: 'read', id: d.id })
        if (r?.error) { line = r.error; return show('error') }
        words = String(r?.text ?? '').split(/\s+/).filter(Boolean)
        starts = scriptLines(words, perLine(ctx))
        at = 0
        note = ''
        show('script')
      } catch { line = 'No signal'; show('error') }
    }

    async function send() {
      busy = true
      fresh = 0
      const from = Math.max(0, at - 8)
      const was = moved
      try {
        const r = await ctx.call({ action: 'follow', pcm: b64(joinPcm(parts)), lang: ctx.lang(), from, at: at - from, words: words.slice(from, at + 80).join(' ') })
        sampleVoice = Boolean(r?.sample)
        replies++
        if (note === 'No voice heard yet') note = ''
        // The reason shows for a moment, then the usual hint (and the way back) returns.
        if (r?.error) { const e = r.error; note = e; follow(false); setTimeout(() => { if (note === e) { note = ''; if (view === 'script') ctx.render() } }, 4000) }
        else { note = ''; if (following && was === moved && typeof r?.at === 'number') at = Math.min(words.length, Math.max(0, r.at)) }
      } catch { note = 'No signal' }
      busy = false
      if (view === 'script') ctx.render()
    }

    function card(): Card {
      switch (view) {
        case 'loading': return { kind: 'status', text: 'Loading', hint: 'wait' }
        case 'error': return { kind: 'status', text: line, hint: 'tap: try again' }
        case 'pick': return { kind: 'status', text: docs[pick].title || 'Untitled', hint: 'tap: use this script · down: next · up: earlier', progress: [pick + 1, docs.length] }
        case 'script': {
          const lead = note ? `${note} · ` : following ? (sampleVoice ? 'Following (sample) · ' : 'Following · ') : ''
          const other = docs.length > 1 ? ' · hold: other scripts' : ''
          if (at >= words.length) return { kind: 'status', text: 'End of script', hint: `${lead}up: line back${other}` }
          const l = lineOf(at)
          return { kind: 'status', text: words.slice(starts[l], starts[l + 1] ?? words.length).join(' '), hint: `${lead}tap: ${following ? 'pause' : 'follow my voice'} · down: next line${other}`, progress: [l + 1, starts.length] }
        }
      }
    }

    return {
      id: 'prompter',
      card,
      start: load,
      stop: () => { if (following) follow(false) },
      audio(p) {
        if (!following || view !== 'script') return
        parts.push(p); bytes += p.length; fresh += p.length
        while (bytes - parts[0].length >= HEAR) bytes -= parts.shift()!.length
        if (fresh >= EVERY && !busy) { if (loud(parts)) void send(); else fresh = 0 }
      },
      input(i) {
        if (view === 'error' && i === 'tap') return void load()
        if (view === 'pick') {
          if (i === 'next') pick = (pick + 1) % docs.length
          if (i === 'prev') pick = (pick - 1 + docs.length) % docs.length
          if (i === 'tap') return void open(docs[pick])
          return ctx.render()
        }
        if (view !== 'script') return
        if (i === 'hold' && docs.length > 1) { follow(false); return show('pick') }
        if (i === 'tap') { note = ''; follow(!following) }
        if (i === 'next' || i === 'prev') moved++
        if (i === 'next') at = at >= words.length ? at : (starts[lineOf(at) + 1] ?? words.length)
        if (i === 'prev') at = at >= words.length ? starts[starts.length - 1] : starts[Math.max(0, lineOf(at) - 1)]
        ctx.render()
      },
    }
  },
}
