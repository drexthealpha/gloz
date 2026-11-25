import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stocksApp, sampleStocks, line, when } from '../app/src/modes/stocks.ts'
import { handle, SAMPLE, tickers } from '../server/modes/stocks.mjs'

function fakeCtx(reply) {
  const calls = []
  const ctx = {
    call: async b => { calls.push(b); return typeof reply === 'function' ? reply(b) : reply },
    lang: () => 'en', render: () => {}, mic: async () => {}, locate: async () => null,
    store: { get: () => null, set: () => {} },
  }
  return { ctx, calls }
}
const tick = () => new Promise(r => setTimeout(r, 0))

test('the sample on the glasses matches the server sample', () => {
  assert.deepEqual(sampleStocks({}), SAMPLE)
})

test('a quote reads as one short line, with its time', () => {
  assert.equal(line({ sym: 'AAPL', price: 231.4, pct: 1.2, t: 0 }), 'AAPL 231.40 +1.2% today')
  assert.equal(line({ sym: 'MSFT', price: 498.12, pct: -0.44, t: 0 }), 'MSFT 498.12 -0.4% today')
  const t = new Date(2026, 10, 20, 16, 0).getTime()
  assert.equal(when(t, t + 3600e3), '16:00')
  assert.equal(when(t, t + 3 * 864e5), 'Nov 20 16:00')
})

test('handler: sample with no key; quotes from Finnhub with the key in a header, not the address', async t => {
  assert.deepEqual(await handle({ op: 'quotes' }, { env: {} }), SAMPLE)
  assert.deepEqual(await handle({ op: 'quotes' }, { env: { GLOZ_SAMPLE: '1', GLOZ_FINNHUB_KEY: 'k' } }), SAMPLE)
  const seen = []
  t.mock.method(globalThis, 'fetch', async (url, opt) => {
    seen.push(String(url))
    assert.equal(opt.headers['x-finnhub-token'], 'test-key')
    assert.equal(opt.headers['user-agent'], 'Gloz/0.1')
    const sym = new URL(url).searchParams.get('symbol')
    return new Response(JSON.stringify(sym === 'ZZZZ' ? { c: 0, dp: null, t: 0 } : { c: 101.5, dp: -2.25, t: 1795467601 }))
  })
  const env = { GLOZ_FINNHUB_KEY: 'test-key', GLOZ_STOCKS: 'ibm, zzzz' }
  const r = await handle({ op: 'quotes' }, { env })
  assert.deepEqual(r, { quotes: [{ sym: 'IBM', price: 101.5, pct: -2.25, t: 1795467601000 }] })
  assert.ok(seen.every(u => !u.includes('test-key')))
  // A second tap within 15 s: no new requests.
  await handle({ op: 'quotes' }, { env })
  assert.equal(seen.length, 2)
  assert.deepEqual(tickers({ GLOZ_STOCKS: 'aapl,,bad ticker!,brk.b' }), ['AAPL', 'BRK.B'])
})

test('handler: the source failing gives an error line', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('limit', { status: 429 }))
  const r = await handle({}, { env: { GLOZ_FINNHUB_KEY: 'k', GLOZ_STOCKS: 'QQQ' } })
  assert.equal(r.error, 'No quotes: quotes 429')
})

test('mode: loads on open, down and up move, tap refreshes, sample is labelled', async () => {
  const { ctx, calls } = fakeCtx(b => sampleStocks(b))
  const m = stocksApp.make(ctx)
  await m.start()
  assert.equal(m.card().text, 'AAPL 231.40 +1.2% today')
  // Just after a refresh the hint says when, with the way back; then it offers the presses again.
  assert.match(m.card().hint, /^sample · updated .+ · double tap: back$/)
  m.input('next')
  assert.equal(m.card().text, 'MSFT 498.12 -0.4% today')
  m.input('prev'); m.input('prev')
  assert.equal(m.card().text, 'NVDA 187.05 +2.3% today')
  m.input('tap')
  await tick()
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[1], { op: 'quotes' })
})

test('mode: a live quote shows its time; no signal keeps the last quotes and says so', async () => {
  const t = Date.now()
  let fail = false
  const { ctx } = fakeCtx(() => { if (fail) throw new Error('down'); return { quotes: [{ sym: 'IBM', price: 1, pct: 0, t }] } })
  const m = stocksApp.make(ctx)
  await m.start()
  assert.equal(m.card().hint, `${when(t)} · double tap: back`)
  fail = true
  m.input('tap'); await tick()
  assert.equal(m.card().text, 'IBM 1.00 +0.0% today')
  assert.match(m.card().hint, /^No signal · /)
  const b = fakeCtx(() => { throw new Error('down') })
  const n = stocksApp.make(b.ctx)
  await n.start()
  assert.equal(n.card().text, 'No signal')
  assert.equal(n.card().hint, 'tap: try again')
})
