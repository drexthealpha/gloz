// Reader: the wearer's own long texts (Notion or Google Docs), page by page at the wearer's
// text size. The place in each text is kept on the phone.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import { SIZES, type Card } from '../core/types.ts'
import type { Doc } from './notes.ts'

// About how many characters fit on one display line at the wearer's size (576 px less the edges,
// an average letter about half the font height wide).
export function perLine(ctx: ModeCtx): number {
  let size = 3
  try { size = Number(JSON.parse(ctx.store.get('gloz.settings') || '{}').size) || 3 } catch {}
  return Math.max(8, Math.floor(552 / (SIZES[Math.min(6, Math.max(1, size)) - 1] * 0.52)))
}

// Splits text into pages of about `chars` characters, at a space where there is one.
// Returns the start of every page; the pages laid end to end give back the whole text.
export function pageStarts(text: string, chars: number): number[] {
  const starts: number[] = []
  for (let i = 0; i < text.length;) {
    starts.push(i)
    let e = Math.min(text.length, i + chars)
    if (e < text.length) {
      let sp = e - 1
      while (sp > i + chars / 2 && text[sp] !== ' ' && text[sp] !== '\n') sp--
      if (sp > i + chars / 2) e = sp + 1
      else { const c = text.charCodeAt(e - 1); if (c >= 0xd800 && c <= 0xdbff) e-- }
    }
    i = e
  }
  return starts.length ? starts : [0]
}

// One page holds six display lines; the glasses show them one at a time.
const LINES_PER_PAGE = 6

const SAMPLE_TEXT = `Sample text: On walking to work

For a year I walked to work instead of taking the bus. The walk took forty minutes each way, which sounds like a lot until you count the time spent waiting at the stop, standing in traffic, and walking from the last stop to the office anyway. The real difference was about twelve minutes a day.

The first weeks were hard. My feet hurt, and I arrived warm and in need of a glass of water. I learned to leave five minutes earlier, to carry a spare shirt in winter, and to keep an umbrella at the office as well as at home.

After a month the walk became the quiet part of the day. I did not look at my phone. I noticed which bakery opened first, which corner had the strongest wind, and which crossing gave the longest wait. I found three ways to go, and picked one by the weather.

Some days I thought about work. Most days I did not think about anything in particular, and that turned out to be the useful part. Problems that had felt stuck the evening before often had an answer by the time I reached the bridge.

There were costs. Shoes wore out twice as fast. On the darkest mornings in December the walk was cold and slow, and twice I took the bus because of ice. I also had less time for the news, which I did not miss.

At the end of the year I had walked a little over three thousand kilometres. I slept better, and I was less tired in the afternoon. I cannot say how much of that came from the walking and how much from other changes that year.

If you want to try it, start with one day a week. Choose a day with good weather and no early meeting. Walk the whole way once, at an easy pace, and see how long it takes. Then decide.

End of the sample text.`

const SAMPLE_DOCS: Record<string, { title: string; text: string }> = {
  'sample-reader': { title: 'Sample: On walking to work', text: SAMPLE_TEXT },
}

export function sampleReader(body: any): any {
  if (body?.action === 'list') return { source: 'sample', notes: Object.entries(SAMPLE_DOCS).map(([id, d]) => ({ id, title: d.title })) }
  if (body?.action === 'read') { const d = SAMPLE_DOCS[body.id]; return d ? { text: d.text } : { error: 'Text not found' } }
  return { error: 'unknown action' }
}

type View = 'loading' | 'error' | 'pick' | 'page' | 'where' | 'end'

export const readerApp: AppEntry = {
  id: 'reader',
  title: () => 'Reader',
  make(ctx: ModeCtx): Mode {
    let view: View = 'loading'
    let docs: Doc[] = []
    let pick = 0
    let doc: Doc | null = null
    let text = ''
    let starts: number[] = [0]
    let page = 0
    let line = ''
    const show = (to: View) => { view = to; ctx.render() }
    const key = () => `reader.place.${doc?.id}`
    const slice = (p: number) => text.slice(starts[p], starts[p + 1] ?? text.length)

    async function load() {
      show('loading')
      try {
        const r = await ctx.call({ action: 'list' })
        if (r?.error) { line = r.error; return show('error') }
        docs = r?.notes ?? []
        if (!docs.length) { line = 'No texts yet'; return show('error') }
        const last = docs.findIndex(d => d.id === ctx.store.get('reader.doc'))
        pick = Math.max(0, last)
        if (docs.length === 1) return void open(docs[0])
        show('pick')
      } catch { line = 'No signal'; show('error') }
    }

    async function open(d: Doc) {
      doc = d
      show('loading')
      try {
        const r = await ctx.call({ action: 'read', id: d.id })
        if (r?.error) { line = r.error; return show('error') }
        text = String(r?.text ?? '')
        starts = pageStarts(text, perLine(ctx) * LINES_PER_PAGE)
        // The place is kept as a character offset, so a new text size keeps it too.
        const at = Number(ctx.store.get(key())) || 0
        page = 0
        while (page + 1 < starts.length && starts[page + 1] <= at) page++
        ctx.store.set('reader.doc', d.id)
        show('page')
      } catch { line = 'No signal'; show('error') }
    }

    function go(p: number) {
      if (p >= starts.length) return show('end')
      page = Math.max(0, p)
      ctx.store.set(key(), String(starts[page]))
      show('page')
    }

    function card(): Card {
      const other = docs.length > 1 ? ' · hold: other texts' : ''
      switch (view) {
        case 'loading': return { kind: 'status', text: 'Loading', hint: 'wait' }
        case 'error': return { kind: 'status', text: line, hint: 'tap: try again' }
        case 'pick': return { kind: 'status', text: docs[pick].title || 'Untitled', hint: 'tap: read · down: next · up: earlier', progress: [pick + 1, docs.length] }
        case 'page': return { kind: 'message', text: slice(page).trim() || ' ', hint: `page ${page + 1}/${starts.length} · down: next page · up: page back${other}`, parts: false, progress: [page + 1, starts.length] }
        case 'where': return { kind: 'status', text: `Page ${page + 1} of ${starts.length}`, hint: `tap: back to the text${other}` }
        case 'end': return { kind: 'status', text: 'End of text', hint: `up: last page${other}` }
      }
    }

    return {
      id: 'reader',
      card,
      start: load,
      input(i) {
        if (view === 'error' && i === 'tap') return void load()
        if (i === 'hold' && doc && docs.length > 1) { pick = Math.max(0, docs.indexOf(doc)); return show('pick') }
        if (view === 'pick') {
          if (i === 'next') pick = (pick + 1) % docs.length
          if (i === 'prev') pick = (pick - 1 + docs.length) % docs.length
          if (i === 'tap') return void open(docs[pick])
          return ctx.render()
        }
        if (view === 'page') {
          if (i === 'next') return go(page + 1)
          if (i === 'prev') return go(page - 1)
        }
        if (view === 'where' && (i === 'tap' || i === 'next' || i === 'prev')) return show('page')
        if (view === 'end' && i === 'prev') return go(starts.length - 1)
      },
    }
  },
}
