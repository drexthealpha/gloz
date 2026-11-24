// Stocks: the tickers set on the Gloz server, one line each ("AAPL 231.40 +1.2%"), with the time
// of the quote so an old price never passes for a live one. Tap asks for new quotes.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

export interface Quote { sym: string; price: number; pct: number; t: number }   // t: quote time, unix ms
export interface Quotes { quotes: Quote[]; sample?: boolean; error?: string }

export function sampleStocks(_body: unknown): Quotes {
  const t = Date.UTC(2026, 10, 20, 21, 0)
  return {
    quotes: [
      { sym: 'AAPL', price: 231.4, pct: 1.2, t },
      { sym: 'MSFT', price: 498.12, pct: -0.4, t },
      { sym: 'NVDA', price: 187.05, pct: 2.31, t },
    ],
    sample: true,
  }
}

export const line = (q: Quote) => `${q.sym} ${q.price.toFixed(2)} ${q.pct >= 0 ? '+' : ''}${q.pct.toFixed(1)}%`

// "16:00" for today, "Nov 20 16:00" for an earlier day, in the phone's time zone.
export function when(t: number, now = Date.now()): string {
  const d = new Date(t)
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toDateString() === new Date(now).toDateString() ? hm : `${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })} ${hm}`
}

function make(ctx: ModeCtx): Mode {
  let r: Quotes | null = null
  let at = 0
  let busy = false
  let note = ''
  let got = ''   // when the last refresh arrived

  async function load() {
    busy = true; ctx.render()
    try {
      const j: Quotes = await ctx.call({ op: 'quotes' })
      if (!j || j.error || !j.quotes?.length) note = j?.error || 'No quotes'
      else { r = j; note = ''; at = Math.min(at, j.quotes.length - 1); got = new Date().toLocaleTimeString(ctx.lang(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
    } catch { note = 'No signal' }
    busy = false; ctx.render()
  }

  return {
    id: 'stocks',
    card(): Card {
      if (busy && !r) return { kind: 'status', text: 'Loading quotes', hint: 'wait a moment' }
      if (!r) return { kind: 'status', text: note || 'No quotes', hint: 'tap: try again' }
      const q = r.quotes[at]
      const time = r.sample ? `sample · updated ${got}` : busy ? 'updating' : note ? `${note} · ${when(q.t)}` : when(q.t)
      return { kind: 'status', text: line(q), hint: `${time} · tap: refresh · down: next`, progress: [at + 1, r.quotes.length] }
    },
    input(i) {
      if (i === 'tap' && !busy) return void load()
      if (!r) return
      if (i === 'next') at = (at + 1) % r.quotes.length
      if (i === 'prev') at = (at - 1 + r.quotes.length) % r.quotes.length
      ctx.render()
    },
    start: load,
  }
}

export const stocksApp: AppEntry = { id: 'stocks', title: () => 'Stocks', make }
