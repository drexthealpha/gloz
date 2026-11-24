// Dashboard: the wearer's chosen panels on one screen. Hold opens the panel picker.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'
import { SIZES, DEFAULT_SETTINGS } from '../core/types.ts'
import { wrap } from '../core/layout.ts'

export const PANELS: [id: string, name: string][] = [
  ['time', 'Time'], ['date', 'Date'], ['unread', 'Unread mail'], ['event', 'Next event'], ['event2', 'Event after'],
  ['tasks', 'Tasks due'], ['task', 'First task due'], ['temp', 'Temperature'], ['range', 'High and low'],
  ['rain', 'Rain chance'], ['wind', 'Wind'], ['pin', 'Pinned text'],
]
export const DEFAULT_PANELS = ['time', 'date', 'unread', 'event', 'tasks', 'temp']
const SERVER = ['unread', 'event', 'event2', 'tasks', 'task', 'temp', 'range', 'rain', 'wind']

// Server reply. A field is null when that service is not set up, missing when not asked for.
export interface DashData {
  unread?: number | null
  events?: { at: string; allDay?: boolean; title: string }[] | null
  tasks?: { due: number; first?: string } | null
  weather?: { temp: number; hi: number; lo: number; rain: number; wind: number } | null
}

export function sampleDash(_body: unknown): DashData {
  return {
    unread: 3,
    events: [{ at: '2026-11-24T09:30:00Z', title: 'Standup' }, { at: '2026-11-24T14:00:00Z', title: 'Board review' }],
    tasks: { due: 2, first: 'Send the budget' },
    weather: { temp: 12, hi: 15, lo: 7, rain: 40, wind: 18 },
  }
}

// Only very long text is shortened here; the grid fits the rest in up to three lines of its cell.
const cut = (s: string, n = 28) => ([...s].length > n ? [...s].slice(0, n - 1).join('') + '…' : s)

// One short item per panel.
export function panelText(id: string, d: DashData, lang: string, now: Date, pin: string, located: boolean): string {
  const hm = (t: Date) => t.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const ev = (e?: { at: string; allDay?: boolean; title: string }) => (e ? cut(e.allDay ? e.title : `${hm(new Date(e.at))} ${e.title}`) : 'No events')
  const w = d.weather
  const noWeather = located ? 'Weather off' : 'No location'
  switch (id) {
    case 'time': return hm(now)
    case 'date': return now.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })
    case 'unread': return d.unread == null ? 'Mail off' : `${d.unread} unread`
    case 'event': return d.events === null ? 'Calendar off' : ev(d.events?.[0])
    case 'event2': return d.events === null ? 'Calendar off' : ev(d.events?.[1])
    case 'tasks': return d.tasks == null ? 'Tasks off' : `${d.tasks.due} due`
    case 'task': return d.tasks == null ? 'Tasks off' : d.tasks.first ? cut(d.tasks.first) : 'No tasks due'
    case 'temp': return w ? `${Math.round(w.temp)}°C` : noWeather
    case 'range': return w ? `${Math.round(w.hi)}° / ${Math.round(w.lo)}°` : noWeather
    case 'rain': return w ? `Rain ${Math.round(w.rain)}%` : noWeather
    case 'wind': return w ? `${Math.round(w.wind)} km/h` : noWeather
    case 'pin': return pin ? cut(pin) : 'No pin'
  }
  return ''
}

// Grid for up to 12 panels on the 576 x 288 display. Each panel starts at the default text
// size and shrinks in 4 px steps, never under 20 px; text that still does not fit is cut ("cut").
export const MIN_PX = 20
const COLS = [1, 1, 2, 3, 2, 3, 3, 4, 4, 3, 4, 4, 4]
export interface Cell { x: number; y: number; w: number; h: number; px: number; lines: string[]; cut: boolean }
export function grid(texts: string[], measure: (s: string, px: number) => number, W = 576, H = 288, pad = 6): Cell[] {
  const n = Math.min(texts.length, 12)
  if (!n) return []
  const cols = COLS[n], rows = Math.ceil(n / cols), w = W / cols, h = H / rows
  return texts.slice(0, n).map((t, i) => {
    const x = (i % cols) * w, y = Math.floor(i / cols) * h, room = w - pad * 2
    const fit = (s: string, px: number) => { const ls = wrap(s, room, m => measure(m, px)); return ls.length * px * 1.2 <= h - pad * 2 && ls.every(l => measure(l, px) <= room) ? ls : null }
    // Fewest lines first, so a short item is never broken inside a word to stay large.
    for (let k = 1; k * MIN_PX * 1.2 <= h - pad * 2; k++) {
      for (let px = SIZES[DEFAULT_SETTINGS.size - 1]; px >= MIN_PX; px -= 4) {
        const ls = fit(t, px)
        if (ls && ls.length <= k) return { x, y, w, h, px, lines: ls, cut: false }
      }
    }
    let s = [...t]
    while (s.length && !fit(s.join('') + '…', MIN_PX)) s = s.slice(0, -1)
    const ls = fit(s.join('') + '…', MIN_PX) ?? ['']
    return { x, y, w, h, px: MIN_PX, lines: ls, cut: true }
  })
}

function make(ctx: ModeCtx): Mode {
  const read = (): string[] => { try { const v = JSON.parse(ctx.store.get('dash.panels') || 'null'); return Array.isArray(v) ? v : DEFAULT_PANELS } catch { return DEFAULT_PANELS } }
  let chosen = read()
  let data: DashData = {}
  let picking = false
  let at = 0
  let note = 'Loading'
  let where: { lat: number; lon: number } | null = null
  const saved = ctx.store.get('dash.where')
  if (saved) { const [lat, lon] = saved.split(',').map(Number); if (isFinite(lat) && isFinite(lon)) where = { lat, lon } }

  async function load() {
    if (!chosen.some(p => SERVER.includes(p))) { note = ''; return ctx.render() }
    try { data = (await ctx.call({ panels: chosen, lat: where?.lat, lon: where?.lon })) || {}; note = '' } catch { note = 'No signal' }
    ctx.render()
  }
  async function locate(): Promise<void> {
    if (where) return
    const p = await ctx.locate()
    if (!p) return
    where = { lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100 }
    ctx.store.set('dash.where', `${where.lat},${where.lon}`)
  }


  return {
    id: 'dash',
    card(): Card {
      if (picking) {
        const [id, name] = PANELS[at]
        return { kind: 'status', text: `${name}: ${chosen.includes(id) ? 'on' : 'off'}`, hint: 'tap: on or off · down: next · up: earlier · hold: done', progress: [at + 1, PANELS.length] }
      }
      if (!chosen.length) return { kind: 'status', text: 'No panels', hint: 'hold: choose panels' }
      const pin = ctx.store.get('dash.pin') || ''
      const items = chosen.map(id => panelText(id, data, ctx.lang(), new Date(), pin, Boolean(where)))
      return { kind: 'status', text: note && note !== 'Loading' ? `${note} · ${items.join(' · ')}` : items.join(' · '), grid: note && note !== 'Loading' ? [note, ...items].slice(0, 12) : items, hint: 'tap: refresh · hold: choose panels' }
    },
    input(i) {
      if (i === 'release') return
      if (i === 'hold') {
        picking = !picking
        if (!picking) { ctx.store.set('dash.panels', JSON.stringify(chosen)); void load() }
        return ctx.render()
      }
      if (!picking) { if (i === 'tap') void load(); return }
      if (i === 'next') at = (at + 1) % PANELS.length
      if (i === 'prev') at = (at - 1 + PANELS.length) % PANELS.length
      if (i === 'tap') { const id = PANELS[at][0]; chosen = chosen.includes(id) ? chosen.filter(p => p !== id) : [...chosen, id] }
      ctx.render()
    },
    // Everything but the weather loads at once; the weather follows when a position arrives.
    async start() { const had = Boolean(where); await load(); await locate(); if (!had && where) await load() },
  }
}

export const dashApp: AppEntry = { id: 'dash', title: () => 'Dashboard', make }
