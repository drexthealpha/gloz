// Navigation: hold, say where to go ("walk to the Ferry Building"), release; or pick a saved place.
// The route comes one step at a time. The start is the phone's position; the route is asked for
// again when the phone moves more than 40 m off it.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

export type Profile = 'foot' | 'cycling' | 'driving'
export interface Place { name: string; lat: number; lon: number; profile: Profile }
export interface Step { text: string; m: number; s: number; at: [number, number] }
export interface Route { to: Place; steps: Step[]; line: [number, number][]; sample?: boolean; error?: string }

const KEY = 'nav.places'
export const OFF_ROUTE_M = 40
const REROUTE_GAP_MS = 15000          // at most one new route request every 15 s
const NEAR_TURN_M = 25                // this close to the next turn: show the step after it

export function sampleNav(body: any): Route {
  const name = typeof body?.text === 'string' && body.text.trim() ? body.text.trim().replace(/^the /i, '').replace(/^./, (c: string) => c.toUpperCase()).slice(0, 24) : 'Ferry Building'
  return {
    to: { name, lat: 37.7955, lon: -122.3937, profile: 'foot' },
    steps: [
      { text: 'Head east on Geary St', m: 120, s: 86, at: [37.7873, -122.4074] },
      { text: 'Turn left onto Kearny St', m: 450, s: 321, at: [37.7877, -122.4036] },
      { text: 'Turn right onto Market St', m: 900, s: 643, at: [37.7905, -122.4042] },
      { text: `Arrive at ${name}`, m: 0, s: 0, at: [37.7955, -122.3937] },
    ],
    line: [[37.7873, -122.4074], [37.7877, -122.4036], [37.7905, -122.4042], [37.7955, -122.3937]],
    sample: true,
  }
}

// Metres between two [lat, lon] points (flat-earth view, exact enough under a few km).
function xy(p: [number, number], o: [number, number]): [number, number] {
  const k = 111320
  return [(p[1] - o[1]) * k * Math.cos(o[0] * Math.PI / 180), (p[0] - o[0]) * k]
}
export function dist(a: [number, number], b: [number, number]): number {
  const [x, y] = xy(b, a)
  return Math.hypot(x, y)
}
// Metres from a point to the nearest part of the route line.
export function offBy(p: [number, number], line: [number, number][]): number {
  if (line.length === 1) return dist(p, line[0])
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = xy(line[i - 1], p), [bx, by] = xy(line[i], p)
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy
    const t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return best
}
export const offRoute = (p: [number, number], line: [number, number][]) => line.length > 0 && offBy(p, line) > OFF_ROUTE_M

export function km(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${m < 100 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50} m`
}
const mins = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`

// The line for step i: "In 200 m, turn left onto Market St".
export function stepLine(r: Route, i: number): string {
  const t = r.steps[i].text
  return i === 0 ? t : `In ${km(r.steps[i - 1].m)}, ${t[0].toLowerCase()}${t.slice(1)}`
}
// Distance and time from step i to the end (the stretch before step i included).
export function left(r: Route, i: number): { m: number; s: number } {
  let m = 0, s = 0
  for (let j = Math.max(0, i - 1); j < r.steps.length; j++) { m += r.steps[j].m; s += r.steps[j].s }
  return { m, s }
}

function load(ctx: ModeCtx): Place[] {
  try { const v = JSON.parse(ctx.store.get(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

// moved: a new phone position (exposed so tests can drive it).
export function makeNav(ctx: ModeCtx): Mode & { moved: (p: [number, number]) => void } {
  let places = load(ctx)
  let pick = 0
  let state: 'pick' | 'busy' | 'route' = 'pick'
  let note = ''
  let info = false
  let route: Route | null = null
  let at = 0
  let pos: [number, number] | null = null
  let lastAsk = 0
  let watch: ReturnType<typeof setInterval> | null = null

  const where = () => (pos ? { lat: pos[0], lon: pos[1] } : {})

  async function ask(body: object, keep = false) {
    lastAsk = Date.now()
    if (!keep) { state = 'busy'; ctx.render() }
    try {
      const r: Route = await ctx.call({ ...body, ...where() })
      if (!r || r.error || !r.steps?.length) { if (!keep) { state = route ? 'route' : 'pick'; note = r?.error || 'No route found' } return ctx.render() }
      route = r; at = 0; info = false; note = ''; state = 'route'
      if (!r.sample) {
        places = [r.to, ...places.filter(p => p.name !== r.to.name)].slice(0, 8)
        ctx.store.set(KEY, JSON.stringify(places))
      }
    } catch { if (!keep) { state = route ? 'route' : 'pick'; note = 'No signal' } }
    ctx.render()
  }

  // A new position: move on past a turn once close to it, and ask again when off the route.
  function moved(p: [number, number]) {
    pos = p
    if (!route || route.sample || state !== 'route') return
    if (at < route.steps.length - 1 && dist(p, route.steps[at + 1].at) < NEAR_TURN_M) { at++; ctx.render() }
    if (offRoute(p, route.line) && Date.now() - lastAsk > REROUTE_GAP_MS) void ask({ op: 'route', to: route.to }, true)
  }

  return {
    id: 'nav',
    say(text: string) { note = ''; void ask({ op: 'say', text, lang: ctx.lang() }) },
    moved,
    card(): Card {
      if (state === 'busy') return { kind: 'status', text: 'Finding the route', hint: 'wait a moment' }
      if (state === 'route' && route) {
        const l = left(route, at)
        const up = at ? ' · up: earlier step' : places.length ? ' · up: saved places' : ''
        const hint = `tap: time left${at < route.steps.length - 1 ? ' · down: next step' : ''}${up}`
        if (info) return { kind: 'status', text: `${route.to.name}: ${km(l.m)} · ${mins(l.s)} left`, hint: `${route.sample ? 'sample · ' : ''}© OpenStreetMap · tap: step` }
        return { kind: 'status', text: stepLine(route, at), hint: route.sample ? `sample · ${hint}` : hint, progress: [at + 1, route.steps.length] }
      }
      if (!places.length) return { kind: 'status', text: note || 'Hold and say where', hint: 'hold: speak · release: find the route' }
      return { kind: 'status', text: note || places[pick].name, hint: 'tap: go · down: next place · up: earlier place · hold: say where', progress: [pick + 1, places.length] }
    },
    input(i) {
      if (state === 'busy') return
      note = ''
      if (state === 'route' && route) {
        if (i === 'tap') info = !info
        if (i === 'next') { at = Math.min(at + 1, route.steps.length - 1); info = false }
        if (i === 'prev') { if (at) at--; else if (places.length) state = 'pick'; info = false }
        return ctx.render()
      }
      if (!places.length) return ctx.render()
      if (i === 'next') pick = (pick + 1) % places.length
      if (i === 'prev') pick = (pick - 1 + places.length) % places.length
      if (i === 'tap') { const p = places[pick]; void ask({ op: 'route', to: p }); return }
      ctx.render()
    },
    start() {
      const tick = () => ctx.locate().then(p => { if (p) moved([p.lat, p.lon]) })
      void tick()
      watch = setInterval(tick, 5000)
    },
    stop() {
      if (watch !== null) clearInterval(watch)
    },
  }
}

export const navApp: AppEntry = { id: 'nav', title: () => 'Navigation', make: makeNav }
