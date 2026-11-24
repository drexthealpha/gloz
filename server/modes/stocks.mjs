// Stocks: quotes for the tickers in GLOZ_STOCKS (comma-separated, e.g. "AAPL,MSFT").
// Source: Finnhub /quote with GLOZ_FINNHUB_KEY (free account; the key is a founder step).
// The no-key Stooq CSV quote address now answers 404 and the site asks browsers to run a script
// check, so it cannot be used. With no key, or GLOZ_SAMPLE=1, the reply is sample data marked as such.
// body: { op: 'quotes' } -> { quotes: [{ sym, price, pct, t }] }   t: quote time, unix ms
const UA = 'Gloz/0.1'
const FRESH_MS = 15000        // repeated taps within 15 s reuse the last answer

const t = Date.UTC(2026, 10, 20, 21, 0)
export const SAMPLE = {
  quotes: [
    { sym: 'AAPL', price: 231.4, pct: 1.2, t },
    { sym: 'MSFT', price: 498.12, pct: -0.4, t },
    { sym: 'NVDA', price: 187.05, pct: 2.31, t },
  ],
  sample: true,
}

const cache = new Map()   // ticker -> { at, quote }

export function tickers(env) {
  return String(env.GLOZ_STOCKS || 'AAPL,MSFT,NVDA').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9.^-]{1,12}$/.test(s)).slice(0, 20)
}

async function one(sym, key) {
  const c = cache.get(sym)
  if (c && Date.now() - c.at < FRESH_MS) return c.quote
  const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}`, { headers: { 'user-agent': UA, 'x-finnhub-token': key }, signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`quotes ${r.status}`)
  const j = await r.json()
  const quote = j.t ? { sym, price: Number(j.c), pct: Number(j.dp) || 0, t: j.t * 1000 } : null   // t 0: unknown ticker
  cache.set(sym, { at: Date.now(), quote })
  return quote
}

export async function handle(_body, { env }) {
  const key = env.GLOZ_FINNHUB_KEY
  if (env.GLOZ_SAMPLE === '1' || !key) return SAMPLE
  try {
    const quotes = (await Promise.all(tickers(env).map(s => one(s, key)))).filter(Boolean)
    return quotes.length ? { quotes } : { error: 'No quotes: check GLOZ_STOCKS' }
  } catch (e) { return { error: `No quotes: ${String(e.message || e).slice(0, 30)}` } }
}
