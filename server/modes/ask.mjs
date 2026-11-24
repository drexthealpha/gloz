// Ask: the glasses send the spoken question as 16 kHz PCM (base64) with the last answers;
// the server writes it down and asks the AI, tried in the same order as server/ai.mjs.
import { transcribe } from '../stt.mjs'
import { NAMES } from '../lang.mjs'

export const SAMPLE = { q: 'Sample: How tall is Mount Everest?', a: 'Mount Everest is 8,849 metres tall, measured by China and Nepal in 2020.' }
export const NO_KEY = 'An AI key is needed on the Gloz server.'

function providers(env) {
  const list = []
  if (env.GLOZ_OPENROUTER_KEY) list.push({ url: 'https://openrouter.ai/api/v1/chat/completions', key: env.GLOZ_OPENROUTER_KEY, model: env.GLOZ_OPENROUTER_MODEL || 'openrouter/auto' })
  if (env.GLOZ_ANTHROPIC_KEY) list.push({ url: 'https://api.anthropic.com/v1/messages', key: env.GLOZ_ANTHROPIC_KEY, model: env.GLOZ_ANTHROPIC_MODEL || 'claude-sonnet-5-5', anthropic: true })
  if (env.GLOZ_OPENAI_KEY) list.push({ url: 'https://api.openai.com/v1/chat/completions', key: env.GLOZ_OPENAI_KEY, model: env.GLOZ_OPENAI_MODEL || 'gpt-4.1-mini' })
  return list
}

async function call(p, system, messages) {
  const signal = AbortSignal.timeout(20000)
  if (p.anthropic) {
    const r = await fetch(p.url, { method: 'POST', signal, headers: { 'x-api-key': p.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 400, system, messages }) })
    if (!r.ok) throw new Error(`ai ${r.status}`)
    return (await r.json()).content.map(c => c.text || '').join('').trim()
  }
  const r = await fetch(p.url, { method: 'POST', signal, headers: { authorization: `Bearer ${p.key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 400, messages: [{ role: 'system', content: system }, ...messages] }) })
  if (!r.ok) throw new Error(`ai ${r.status}`)
  return (await r.json()).choices[0].message.content.trim()
}

// body: { pcm: base64, lang, history: [{q, a}] } or { q } for a typed question.
export async function handle(body, { env }) {
  if (env.GLOZ_SAMPLE === '1') { if (body?.pcm) { let t = ''; try { t = (await transcribe(Buffer.from(String(body.pcm), 'base64'), String(body.lang || 'en'))).text } catch { return { error: 'No speech engine on the server' } } if (!String(t || '').trim()) return { error: 'Nothing heard' } } return SAMPLE }
  const list = providers(env)
  if (!list.length) return { q: '', a: NO_KEY }
  const lang = String(body?.lang || 'en')
  let q = String(body?.q || '').trim()
  if (!q && body?.pcm) {
    try { q = (await transcribe(Buffer.from(String(body.pcm), 'base64'), lang)).text } catch { return { error: 'No speech engine on the server' } }
  }
  if (!q) return { error: 'Nothing heard' }
  const history = (Array.isArray(body?.history) ? body.history : []).filter(h => h?.q && h?.a).slice(-10)
  const messages = [...history.flatMap(h => [{ role: 'user', content: String(h.q) }, { role: 'assistant', content: String(h.a) }]), { role: 'user', content: q }]
  const system = `Answer the question for someone reading one line at a time on smart glasses. Answer in ${NAMES[lang] || lang}. Plain text, no lists or markdown, at most 60 words. If you do not know, say so.`
  let last
  for (const p of list) {
    try { return { q, a: await call(p, system, messages) } } catch (e) { last = e }
  }
  return { q, error: `No answer: ${String(last?.message || 'AI unreachable').slice(0, 60)}` }
}
