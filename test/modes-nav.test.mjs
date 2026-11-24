import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { makeNav, sampleNav, stepLine, left, offRoute, offBy, km } from '../app/src/modes/nav.ts'
import { handle, SAMPLE, parse, say } from '../server/modes/nav.mjs'

function fakeCtx(reply) {
  const calls = [], mic = [], kv = {}
  const ctx = {
    call: async b => { calls.push(b); return typeof reply === 'function' ? reply(b) : reply },
    lang: () => 'en', render: () => {}, mic: async on => { mic.push(on) }, locate: async () => null,
    store: { get: k => kv[k] ?? null, set: (k, v) => { kv[k] = v } },
  }
  return { ctx, calls, mic, kv }
}
const tick = () => new Promise(r => setTimeout(r, 0))

// A small OSRM answer: depart east, turn left, arrive.
const OSRM = {
  code: 'Ok',
  routes: [{
    geometry: { coordinates: [[-122.4074, 37.7873], [-122.4036, 37.7877], [-122.4042, 37.7905]] },
    legs: [{ steps: [
      { name: 'Geary St', distance: 336, duration: 40, maneuver: { type: 'depart', bearing_after: 85, location: [-122.4074, 37.7873] } },
      { name: 'Kearny St', distance: 314, duration: 35, maneuver: { type: 'turn', modifier: 'left', location: [-122.4036, 37.7877] } },
      { name: '', distance: 0, duration: 0, maneuver: { type: 'arrive', location: [-122.4042, 37.7905] } },
    ] }],
  }],
}

test('the sample on the glasses matches the server sample', () => {
  assert.deepEqual(sampleNav({}), SAMPLE)
})

test('step lines read as directions', () => {
  const r = sampleNav({})
  assert.equal(stepLine(r, 0), 'Head east on Geary St')
  assert.equal(stepLine(r, 1), 'In 100 m, turn left onto Kearny St')
  assert.equal(stepLine(r, 2), 'In 450 m, turn right onto Market St')
  assert.deepEqual(left(r, 2), { m: 1350, s: 964 })
  assert.equal(km(1350), '1.4 km')
  assert.equal(say({ name: 'Market St', maneuver: { type: 'turn', modifier: 'slight right' } }, 'x'), 'Bear right onto Market St')
  assert.equal(say({ name: '', maneuver: { type: 'roundabout', exit: 2 } }, 'x'), 'At the roundabout, take exit 2')
  assert.deepEqual(parse('Cycle to the Ferry Building.'), { profile: 'cycling', q: 'the Ferry Building' })
  assert.deepEqual(parse('Drive to Oakland'), { profile: 'driving', q: 'Oakland' })
  assert.deepEqual(parse('City Hall'), { profile: 'foot', q: 'City Hall' })
})

test('off route means more than 40 m from the line', () => {
  const line = [[37.7873, -122.4074], [37.7877, -122.4036]]
  const north = m => [37.7875 + m / 111320, -122.4055]
  assert.equal(offRoute(north(30), line), false)
  assert.equal(offRoute(north(55), line), true)
  assert.ok(Math.abs(offBy(north(50), line) - 50) < 2)
})

test('handler: sample mode and a missing position', async () => {
  assert.deepEqual(await handle({ op: 'say' }, { env: { GLOZ_SAMPLE: '1' } }), SAMPLE)
  assert.match((await handle({ op: 'route', to: SAMPLE.to }, { env: {} })).error, /No position/)
})

test('handler: a spoken place is found once, routed, and walking time comes from distance', async t => {
  const urls = []
  t.mock.method(globalThis, 'fetch', async (url, opt) => {
    urls.push(String(url))
    assert.equal(opt.headers['user-agent'], 'Gloz/0.1')
    if (String(url).includes('nominatim')) return new Response(JSON.stringify([{ name: 'Union Square', lat: '37.7905', lon: '-122.4042' }]))
    return new Response(JSON.stringify(OSRM))
  })
  const stt = mock.fn(async () => ({ text: 'Walk to Union Square.' }))
  const body = { op: 'say', pcm: Buffer.alloc(8000).toString('base64'), lang: 'en', lat: 37.7873, lon: -122.4074 }
  const r = await handle(body, { env: {}, stt })
  assert.equal(r.to.name, 'Union Square')
  assert.equal(r.to.profile, 'foot')
  assert.deepEqual(r.steps.map(s => s.text), ['Head east on Geary St', 'Turn left onto Kearny St', 'Arrive at Union Square'])
  assert.equal(r.steps[0].s, Math.round(336 / 1.4))
  assert.match(urls[1], /router\.project-osrm\.org\/route\/v1\/foot\/-122\.4074,37\.7873;-122\.4042,37\.7905/)
  // The same words again: no second search.
  await handle(body, { env: {}, stt })
  assert.equal(urls.filter(u => u.includes('nominatim')).length, 1)
  assert.equal(urls.length, 3)
})

test('handler: nothing found, and no speech engine', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('[]'))
  const at = { lat: 1, lon: 2 }
  assert.match((await handle({ op: 'say', pcm: '', ...at }, { env: {}, stt: async () => ({ text: 'Nowhere Street 99' }) })).error, /Not found/)
  assert.match((await handle({ op: 'say', pcm: '', ...at }, { env: {}, stt: async () => { throw new Error('no engine') } })).error, /No speech engine/)
})

test('mode: hold, speak, release finds the route; steps move; tap shows what is left', async () => {
  const { ctx, calls, mic, kv } = fakeCtx(() => ({ ...sampleNav({}), sample: undefined }))
  const m = makeNav(ctx)
  assert.match(m.card().text, /Hold and say where/)
  m.input('hold'); m.audio(new Uint8Array([1, 2, 3, 4])); m.input('release')
  await tick()
  assert.deepEqual(mic, [true, false])
  assert.equal(calls[0].op, 'say')
  assert.equal(calls[0].pcm, btoa(String.fromCharCode(1, 2, 3, 4)))
  assert.equal(m.card().text, 'Head east on Geary St')
  assert.match(m.card().hint, /^tap: time left · down: next step( · up: saved places)? · hold: new place$/)
  m.input('next')
  assert.equal(m.card().text, 'In 100 m, turn left onto Kearny St')
  m.input('tap')
  assert.equal(m.card().text, 'Ferry Building: 1.5 km · 18 min left')
  m.input('tap'); m.input('prev'); m.input('prev')
  // Back at the places: the destination was saved.
  assert.equal(m.card().text, 'Ferry Building')
  assert.equal(JSON.parse(kv['nav.places'])[0].name, 'Ferry Building')
  m.input('tap')
  await tick()
  assert.equal(calls[1].op, 'route')
  assert.equal(calls[1].to.name, 'Ferry Building')
})

test('mode: moving more than 40 m off the route asks again, at most every 15 s', async () => {
  const { ctx, calls } = fakeCtx(() => ({ ...sampleNav({}), sample: undefined }))
  const m = makeNav(ctx)
  const now = mock.method(Date, 'now', () => 1_000_000)
  m.input('hold'); m.audio(new Uint8Array(4)); m.input('release')
  await tick()
  now.mock.mockImplementation(() => 1_020_000)
  m.moved([37.7875 + 20 / 111320, -122.4055])   // 20 m off: no new route
  assert.equal(calls.length, 1)
  m.moved([37.7875 + 60 / 111320, -122.4055])   // 60 m off: new route from here
  assert.equal(calls.length, 2)
  assert.equal(calls[1].op, 'route')
  assert.ok(Math.abs(calls[1].lat - (37.7875 + 60 / 111320)) < 1e-9)
  m.moved([37.7875 + 70 / 111320, -122.4055])   // still off, but within 15 s
  assert.equal(calls.length, 2)
  // Close to the next turn: the step after it shows.
  await tick()
  m.moved([37.7877, -122.4037])
  assert.equal(m.card().text, 'In 100 m, turn left onto Kearny St')
  now.mock.restore()
})

test('mode: no signal and server errors are shown as a line', async () => {
  const a = fakeCtx(() => { throw new Error('down') })
  const m = makeNav(a.ctx)
  m.input('hold'); m.audio(new Uint8Array(4)); m.input('release')
  await tick()
  assert.equal(m.card().text, 'No signal')
  const b = fakeCtx({ error: 'No position: allow location on the phone' })
  const n = makeNav(b.ctx)
  n.input('hold'); n.audio(new Uint8Array(4)); n.input('release')
  await tick()
  assert.equal(n.card().text, 'No position: allow location on the phone')
  // Released with no sound: nothing is sent.
  n.input('hold'); n.input('release')
  assert.equal(b.calls.length, 1)
  assert.equal(n.card().text, 'Nothing heard')
})
