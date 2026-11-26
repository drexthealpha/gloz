// Weather and News: a few lines from the Gloz server, one at a time. The last answer is kept on the
// glasses, so with no signal they still show it, with the time it was fetched.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'
import { when } from './stocks.ts'

interface Lines { lines: string[]; t: number; sample?: boolean; source?: string; error?: string }

function feed(id: string, name: string, locate: boolean) {
  return (ctx: ModeCtx): Mode => {
    let r: Lines | null = null
    try { r = JSON.parse(ctx.store.get(`feed.${id}`) || 'null') } catch { r = null }
    let at = 0, busy = false, note = ''
    async function load() {
      busy = true; ctx.render()
      try {
        const where = locate ? await ctx.locate() : null
        const j: Lines = await ctx.call(where ? { lat: where.lat, lon: where.lon } : {})
        if (!j || j.error || !j.lines?.length) note = j?.error || `No ${name.toLowerCase()}`
        else { r = j; note = ''; at = 0; ctx.store.set(`feed.${id}`, JSON.stringify(j)) }
      } catch { note = 'No signal' }
      busy = false; ctx.render()
    }
    return {
      id,
      card(): Card {
        if (!r) return busy ? { kind: 'status', text: `Getting ${name.toLowerCase()}…`, hint: 'wait a moment' } : { kind: 'status', text: note || `No ${name.toLowerCase()}`, hint: 'tap: try again · double tap: back' }
        const time = r.sample ? 'sample' : `${note ? `${note} · ` : ''}${r.source ? `${r.source} ` : ''}${when(r.t)}`
        return { kind: 'status', text: r.lines[at], hint: `${busy ? 'updating' : time} · down: next · tap: refresh`, progress: [at + 1, r.lines.length] }
      },
      input(i) {
        if (i === 'tap' && !busy) return void load()
        if (!r) return
        if (i === 'next') at = (at + 1) % r.lines.length
        if (i === 'prev') at = (at - 1 + r.lines.length) % r.lines.length
        ctx.render()
      },
      start: load,
    }
  }
}

export const weatherApp: AppEntry = { id: 'weather', title: () => 'Weather', make: feed('weather', 'Weather', true) }
export const newsApp: AppEntry = { id: 'news', title: () => 'News', make: feed('news', 'News', false) }
