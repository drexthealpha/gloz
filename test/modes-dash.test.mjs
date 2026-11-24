// Dashboard: presses, the server handler with fetch mocked, and the 12-panel measure.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashApp, sampleDash, panelText, grid, PANELS, DEFAULT_PANELS, MIN_PX } from '../app/src/modes/dash.ts'
import { handle, SAMPLE, resetCache } from '../server/modes/dash.mjs'
import { measure } from '../eval/text-width.mjs'

function fakeCtx(reply) {
  const mem = new Map()
  const ctx = {
    calls: [],
    call: async b => { ctx.calls.push(b); if (reply instanceof Error) throw reply; return reply },
    lang: () => 'en', render: () => {}, mic: async () => {}, locate: async () => null,
    store: { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) },
  }
  return ctx
}

test('dash: default panels show as short items; battery is not a panel', async () => {
  const ctx = fakeCtx(SAMPLE)
  const m = dashApp.make(ctx)
  await m.start()
  assert.deepEqual(ctx.calls[0].panels, DEFAULT_PANELS)
  const c = m.card()
  assert.match(c.text, /10 unread · .*Standup · 4 tasks due · 12°C$/)
  assert.match(c.hint, /(^|· )tap: refresh · hold: panels · double tap: back$/)
  assert.ok(!PANELS.some(([id]) => /batt/.test(id)))
})

test('dash: hold opens the picker, down and up move, tap toggles, hold saves', async () => {
  const ctx = fakeCtx(SAMPLE)
  const m = dashApp.make(ctx)
  await m.start()
  m.input('hold'); m.input('release')
  assert.equal(m.card().text, 'Time: on')
  assert.deepEqual(m.card().progress, [1, 12])
  m.input('tap')
  assert.equal(m.card().text, 'Time: off')
  m.input('prev')
  assert.equal(m.card().text, 'Your note from the phone: off')
  m.input('tap')
  m.input('next'); m.input('next')
  assert.equal(m.card().text, 'Date: on')
  m.input('hold')
  assert.deepEqual(JSON.parse(ctx.store.get('dash.panels')), ['date', 'unread', 'event', 'tasks', 'temp', 'pin'])
  ctx.store.set('dash.pin', 'Gate B12')
  assert.match(m.card().text, /Gate B12$/)
  // A reopen keeps the choice.
  const again = dashApp.make(ctx)
  await again.start()
  assert.deepEqual(ctx.calls.at(-1).panels, ['date', 'unread', 'event', 'tasks', 'temp', 'pin'])
})

test('dash: no signal, services not set up, and no location each say so', async () => {
  let m = dashApp.make(fakeCtx(new Error('down')))
  await m.start()
  assert.match(m.card().text, /^No signal · /)
  m = dashApp.make(fakeCtx({ unread: null, events: null, tasks: null, weather: null }))
  await m.start()
  assert.match(m.card().text, /Mail off · Calendar off · Tasks off · No location$/)
  // Time and date alone need no server.
  const ctx = fakeCtx(SAMPLE)
  ctx.store.set('dash.panels', '["time","date"]')
  await dashApp.make(ctx).start()
  assert.equal(ctx.calls.length, 0)
  assert.deepEqual(sampleDash({}), SAMPLE)
})

async function withFetch(fn, route) {
  const real = globalThis.fetch
  const seen = []
  globalThis.fetch = async (url, init = {}) => { seen.push({ url: String(url), init }); return route(String(url)) }
  resetCache()
  try { return await fn(seen) } finally { globalThis.fetch = real }
}
const json = v => new Response(JSON.stringify(v))

test('dash server: no Google keys gives null fields; sample mode gives the sample', async () => {
  await withFetch(async seen => {
    assert.deepEqual(await handle({ panels: ['unread', 'event', 'task'] }, { env: {} }), { unread: null, events: null, tasks: null })
    assert.deepEqual(await handle({ panels: ['temp'] }, { env: {} }), { weather: null })
    assert.equal(seen.length, 0)
  }, () => { throw new Error('no network') })
  assert.deepEqual(await handle({ panels: ['temp'] }, { env: { GLOZ_SAMPLE: '1' } }), SAMPLE)
})

test('dash server: Open-Meteo once per place (cached), with a plain User-Agent', async () => {
  const meteo = { current: { temperature_2m: 11.6, wind_speed_10m: 9 }, daily: { temperature_2m_max: [14], temperature_2m_min: [6], precipitation_probability_max: [30] } }
  await withFetch(async seen => {
    const a = await handle({ panels: ['temp', 'rain'], lat: 52.52, lon: 13.41 }, { env: {} })
    assert.deepEqual(a.weather, { temp: 11.6, wind: 9, hi: 14, lo: 6, rain: 30 })
    await handle({ panels: ['wind'], lat: 52.52, lon: 13.41 }, { env: {} })
    assert.equal(seen.length, 1)
    assert.match(seen[0].url, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=52\.52&longitude=13\.41/)
    assert.equal(seen[0].init.headers['user-agent'], 'Gloz/0.1')
  }, () => json(meteo))
})

test('dash server: Google mail, calendar and tasks share one token; a refused service is null', async () => {
  const env = { GLOZ_GOOGLE_CLIENT_ID: 'a', GLOZ_GOOGLE_CLIENT_SECRET: 'b', GLOZ_GOOGLE_REFRESH_TOKEN: 'c' }
  await withFetch(async seen => {
    const r = await handle({ panels: ['unread', 'event2', 'tasks'] }, { env })
    assert.equal(r.unread, 4)
    assert.deepEqual(r.events, [{ at: '2026-11-24T09:30:00Z', allDay: false, title: 'Standup' }, { at: '2026-11-25', allDay: true, title: 'Offsite' }])
    assert.equal(r.tasks, null)   // the token was not given the Tasks scope
    assert.equal(seen.filter(s => s.url.includes('oauth2')).length, 1)
  }, url => url.includes('oauth2') ? json({ access_token: 't', expires_in: 3600 })
    : url.includes('gmail') ? json({ messagesUnread: 4 })
    : url.includes('calendar') ? json({ items: [{ summary: 'Standup', start: { dateTime: '2026-11-24T09:30:00Z' } }, { summary: 'Offsite', start: { date: '2026-11-25' } }] })
    : new Response('{}', { status: 403 }))
})

// Measure. Global best: 11 user-chosen data fields on one page (a bike computer); a smartwatch face has 8.
// Gloz: all 12 panels, each at its longest text, laid out on one 576 x 288 page starting at the default
// text size (48 px). Text width comes from Helvetica glyph widths (units per 1000 em) plus 10% for the
// phone's own sans-serif fonts; a panel passes when every line fits its cell's width and height at 20 px
// or more and nothing was cut.

test('dash measure: 12 user-chosen panels on one 576 x 288 page (grid 576 x 256 above the hint), none cut, none under 20 px', t => {
  // The longest text each panel can produce (formatters cut names to 18 or 20 characters).
  const data = {
    unread: 12345, events: [{ at: '2026-11-24T23:45:00Z', title: 'Quarterly board review with investors' }, { at: '2026-11-25T08:00:00Z', title: 'Dinner with the Hamburg team' }],
    tasks: { due: 999, first: 'Send the signed contract to legal' }, weather: { temp: -12.4, hi: -10, lo: -22, rain: 100, wind: 104 },
  }
  const now = new Date('2026-09-30T23:59:00Z')
  const texts = PANELS.map(([id]) => panelText(id, data, 'en', now, 'Pick up dry cleaning before 6', true))
  assert.equal(texts.length, 12)
  // On the glasses the hint line takes the bottom 32 px, so the grid gets 576 x 256.
  const cells = grid(texts, measure, 576, 256)
  for (const c of cells) {
    assert.ok(c.px >= MIN_PX, `${c.lines} at ${c.px}px`)
    assert.ok(!c.cut, `${c.lines} was cut`)
    for (const l of c.lines) assert.ok(measure(l, c.px) <= c.w - 12, `${l} wider than its cell`)
    assert.ok(c.lines.length * c.px * 1.2 <= c.h - 12, `${c.lines} taller than its cell`)
    assert.ok(c.x + c.w <= 576 + 1e-9 && c.y + c.h <= 256 + 1e-9)
  }
  t.diagnostic(`12 panels, 4 x 3 cells of 144 x 85 px above the hint line; font px per panel: ${cells.map(c => c.px).join(', ')}; smallest ${Math.min(...cells.map(c => c.px))}`)
  t.diagnostic(cells.map(c => c.lines.join(' / ')).join(' | '))
})

test('dash measure: text too wide for a cell is cut with a mark, never drawn past the cell', () => {
  const cells = grid(Array(12).fill('WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'), measure)
  for (const c of cells) {
    assert.equal(c.px, MIN_PX)
    assert.ok(c.cut)
    assert.match(c.lines.at(-1), /…$/)
    for (const l of c.lines) assert.ok(measure(l, c.px) <= c.w - 12)
  }
})
