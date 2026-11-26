// News: the latest headlines from a public RSS feed (GLOZ_NEWS_FEED; default BBC News world headlines,
// free, no key). body: {} -> { lines: [string], t, source }
const FEED = 'https://feeds.bbci.co.uk/news/world/rss.xml'

export const SAMPLE = { lines: ['Sample headline one', 'Sample headline two', 'Sample headline three'], t: Date.UTC(2026, 10, 20, 9, 0), source: 'sample', sample: true }

const unxml = s => s.replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).trim()

// The item titles of an RSS or Atom feed, in order.
export function headlines(xml, max = 15) {
  const out = []
  for (const m of String(xml).matchAll(/<(item|entry)\b[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/g)) {
    const t = unxml(m[2])
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= max) break
  }
  return out
}

export async function handle(_body, { env, fetch: get = globalThis.fetch }) {
  if (env.GLOZ_SAMPLE === '1') return SAMPLE
  const url = env.GLOZ_NEWS_FEED || FEED
  try {
    const r = await get(url, { headers: { 'user-agent': 'Gloz/0.1' }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return { error: `No news: ${r.status}` }
    const lines = headlines(await r.text())
    return lines.length ? { lines, t: Date.now(), source: new URL(url).hostname.replace(/^(www|feeds)\./, '') } : { error: 'No news in the feed' }
  } catch { return { error: 'No news: no connection' } }
}
