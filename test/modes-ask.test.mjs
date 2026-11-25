// Ask: presses on the glasses and the server handler, with no keys and no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { askApp, sampleAsk } from '../app/src/modes/ask.ts'
import { handle, SAMPLE, NO_KEY } from '../server/modes/ask.mjs'

function fakeCtx(reply) {
  const mem = new Map()
  const ctx = {
    calls: [], mics: [], renders: 0,
    call: async b => { ctx.calls.push(b); if (reply instanceof Error) throw reply; return typeof reply === 'function' ? reply(b) : reply },
    lang: () => 'de',
    render: () => { ctx.renders++ },
    mic: async on => { ctx.mics.push(on) }, locate: async () => null,
    store: { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) },
  }
  return ctx
}
const tick = () => new Promise(r => setTimeout(r, 0))

test('ask: words said are sent, the answer shows paged with a hint', async () => {
  const ctx = fakeCtx(b => ({ q: 'Wie hoch ist der Everest?', a: `8849 Meter (${b.history.length} before)` }))
  const m = askApp.make(ctx)
  assert.equal(m.card().text, 'Hold and ask')
  m.say('Wie hoch ist der Everest?')
  assert.equal(m.card().text, 'Thinking')
  await tick()
  assert.equal(ctx.calls[0].q, 'Wie hoch ist der Everest?')
  assert.equal(ctx.calls[0].lang, 'de')
  const c = m.card()
  assert.equal(c.kind, 'message')
  assert.match(c.text, /8849 Meter/)
  assert.match(c.hint, /^up: earlier part · (down: next answer · )?hold: ask again$/)
  // A follow-up carries the earlier question and answer.
  m.say('Und der K2?'); await tick()
  assert.equal(ctx.calls[1].history.length, 1)
  assert.deepEqual(m.card().progress, [2, 2])
  // Up before the first page goes to the earlier answer; down comes back; tap asks again.
  m.input('prev'); assert.deepEqual(m.card().progress, [1, 2])
  m.input('next'); assert.deepEqual(m.card().progress, [2, 2])
  m.input('tap'); assert.equal(m.card().text, 'Hold and ask')
})

test('ask: keeps only the last 10, survives a reopen, and says No signal on failure', async () => {
  let n = 0
  const ctx = fakeCtx(() => ({ q: `q${++n}`, a: `a${n}` }))
  let m = askApp.make(ctx)
  for (let i = 0; i < 12; i++) { m.say(`q${i}`); await tick() }
  assert.equal(JSON.parse(ctx.store.get('ask.log')).length, 10)
  assert.equal(JSON.parse(ctx.store.get('ask.log'))[0].q, 'q3')
  m = askApp.make(ctx)
  m.input('prev')
  assert.equal(m.card().text, 'a12')
  const bad = fakeCtx(new Error('down'))
  m = askApp.make(bad)
  m.say('anything'); await tick()
  assert.equal(m.card().text, 'No signal')
  assert.equal(bad.calls.length, 1)
})

test('ask server: no key gives one plain line; sample mode gives the sample', async () => {
  assert.deepEqual(await handle({ q: 'hi' }, { env: {} }), { q: '', a: NO_KEY })
  assert.deepEqual(await handle({}, { env: { GLOZ_SAMPLE: '1' } }), SAMPLE)
  // A typed question gets a sample line that says where a real answer comes from, never a made-up answer.
  assert.deepEqual(await handle({ q: 'hi' }, { env: { GLOZ_SAMPLE: '1' } }), { q: 'hi', a: 'Sample answer: with an AI key on the Gloz server, the real answer appears here.' })
  assert.deepEqual(sampleAsk({}), SAMPLE)
})

test('ask server: answers in the wearer language with history, falls through providers', async () => {
  const real = globalThis.fetch
  const seen = []
  globalThis.fetch = async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) })
    if (url.includes('openrouter')) return new Response('down', { status: 500 })
    return new Response(JSON.stringify({ content: [{ text: 'Achttausend Meter.' }] }), { status: 200 })
  }
  try {
    const r = await handle({ q: 'Und der K2?', lang: 'de', history: [{ q: 'Everest?', a: '8849 m' }, { q: '', a: 'skip me' }] }, { env: { GLOZ_OPENROUTER_KEY: 'x', GLOZ_ANTHROPIC_KEY: 'y' } })
    assert.deepEqual(r, { q: 'Und der K2?', a: 'Achttausend Meter.' })
    assert.equal(seen.length, 2)
    const b = seen[1].body
    assert.match(b.system, /German/)
    assert.deepEqual(b.messages.map(m => m.role), ['user', 'assistant', 'user'])
  } finally { globalThis.fetch = real }
})

test('ask server: audio too short to hold a question gives a clear line', async () => {
  // Under 0.1 s the speech engine is never loaded, so this stays offline.
  const r = await handle({ pcm: Buffer.alloc(100).toString('base64'), lang: 'en' }, { env: { GLOZ_ANTHROPIC_KEY: 'y' } })
  assert.deepEqual(r, { error: 'Nothing heard' })
})

// Measure: the global best is the top model on the LMArena text leaderboard (score 1507).
// Gloz's answers come from whichever model the owner sets, so the score is that model's own;
// with no key here no answer can be produced, so no Gloz number is reported.
test('ask measure: no honest score can be produced here without a key', async () => {
  const r = await handle({ q: 'test' }, { env: {} })
  assert.equal(r.a, NO_KEY)
})
