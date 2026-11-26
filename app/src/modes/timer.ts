// Timer: say "timer 5 minutes" and it counts down on the glasses. It runs on the glasses alone,
// so it keeps time with no signal and no server.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

// "5 minutes", "90 seconds", "1 hour 30 minutes", "2 min", "10" (minutes): seconds, or null.
// Number words Whisper may write: one to twelve by position, then the round ones.
const NUM: Record<string, number> = Object.fromEntries('one two three four five six seven eight nine ten eleven twelve'.split(' ').map((w, i) => [w, i + 1]))
Object.assign(NUM, { a: 1, an: 1, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, fifty: 50, sixty: 60, ninety: 90 })
export function seconds(text: string): number | null {
  const t = text.toLowerCase().replace(/half an hour/g, '30 minutes').replace(/\b(forty-five|[a-z]+)\b(?=\s*(?:h(?:ours?)?|m(?:in(?:ute)?s?)?|s(?:ec(?:ond)?s?)?)\b)/g, w => NUM[w] !== undefined ? String(NUM[w]) : w)
  let s = 0, found = false
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(h(?:ours?|rs?)?|m(?:in(?:ute)?s?)?|s(?:ec(?:ond)?s?)?)\b/g)) {
    const n = Number(m[1]), u = m[2][0]
    s += u === 'h' ? n * 3600 : u === 'm' ? n * 60 : n
    found = true
  }
  if (!found) { const n = t.match(/^\s*(\d+(?:\.\d+)?)\s*$/); if (n) { s = Number(n[1]) * 60; found = true } }
  return found && s > 0 ? Math.round(Math.min(s, 24 * 3600)) : null
}

// "4:59", "1:02:03"
export function clock(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${two(m)}:${two(x)}` : `${m}:${two(x)}`
}

function make(ctx: ModeCtx): Mode {
  let total = 0, endsAt = 0, left = 0, paused = false
  let tick: ReturnType<typeof setInterval> | null = null
  const remaining = () => paused ? left : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
  function run(s: number) {
    total = s; left = s; endsAt = Date.now() + s * 1000; paused = false
    if (!tick) tick = setInterval(() => { ctx.render(); if (!paused && remaining() === 0 && tick) { clearInterval(tick); tick = null } }, 1000)
    ctx.render()
  }
  return {
    id: 'timer',
    card(): Card {
      if (!total) return { kind: 'status', text: 'Timer: hold and say how long', hint: 'tap: 5 minutes · double tap: back' }
      const r = remaining()
      if (r === 0) return { kind: 'status', text: `Time's up · ${clock(total)}`, hint: 'tap: again · double tap: back' }
      return { kind: 'status', text: clock(r), hint: paused ? 'Paused · tap: go on · double tap: back' : 'tap: pause · double tap: back' }
    },
    input(i) {
      if (i !== 'tap') return
      if (!total) return run(300)
      if (remaining() === 0) return run(total)
      if (paused) { endsAt = Date.now() + left * 1000; paused = false }
      else { left = remaining(); paused = true }
      ctx.render()
    },
    say(text) { const s = seconds(text); if (s) run(s) },
    stop() { if (tick) clearInterval(tick); tick = null },
  }
}

export const timerApp: AppEntry = { id: 'timer', title: () => 'Timer', make }
