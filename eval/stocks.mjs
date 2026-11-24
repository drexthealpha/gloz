// Stocks: time from a tap on the glasses side to the new card, through a real HTTP request to a
// local server that runs the stocks handler. The quote source is answered at once by a stand-in,
// so this is Gloz's own path only: no internet, no quote source, no phone-to-glasses Bluetooth.
//   node eval/stocks.mjs
import { createServer } from 'node:http'
import { handle } from '../server/modes/stocks.mjs'
import { stocksApp } from '../app/src/modes/stocks.ts'

const realFetch = globalThis.fetch
let n = 0
globalThis.fetch = async (url, opt) => String(url).startsWith('https://finnhub.io/')
  ? new Response(JSON.stringify({ c: 100 + (n++ % 50), dp: 0.5, t: 1795467601 }))
  : realFetch(url, opt)
const env = { GLOZ_FINNHUB_KEY: 'stand-in', GLOZ_STOCKS: 'AAPL' }

const server = createServer(async (req, res) => {
  let b = ''
  for await (const c of req) b += c
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(await handle(JSON.parse(b || '{}'), { env })))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

let rendered = () => {}
const ctx = {
  call: async body => (await realFetch(`${base}/mode/stocks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json(),
  lang: () => 'en', render: () => rendered(), mic: async () => {}, store: { get: () => null, set: () => {} },
}
const m = stocksApp.make(ctx)
await m.start()
const runs = []
for (let i = 0; i < 300; i++) {
  const t0 = performance.now()
  // Done when the card is drawn with the new quotes (the second render after the tap).
  await new Promise(done => { let k = 0; rendered = () => { if (++k === 2) done() }; m.input('tap') })
  m.card()
  if (i >= 20) runs.push(performance.now() - t0)   // the first 20 warm up
}
server.close()
runs.sort((a, b) => a - b)
const q = p => Number((runs[Math.floor(p * (runs.length - 1))] * 1000).toFixed(0))
console.log({ path: 'tap -> HTTP POST /mode/stocks on 127.0.0.1 -> handler -> card', runs: runs.length, medianUs: q(0.5), p95Us: q(0.95), notIncluded: 'quote source over the internet, phone to glasses Bluetooth, display' })
