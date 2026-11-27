// Ask: the glasses send the spoken question as 16 kHz PCM (base64) with the last answers;
// the server writes it down and asks the AI, tried in the same order as server/ai.mjs.
import { transcribe } from '../stt.mjs'
import { NAMES } from '../lang.mjs'
import { evidence } from '../take-apart.mjs'
import { near } from '../ai.mjs'

export const SAMPLE = { q: 'Sample: How tall is Mount Everest?', a: 'Mount Everest is 8,849 metres tall, measured by China and Nepal in 2020.' }
export const NO_KEY = 'An AI key is needed on the Gloz server.'

function providers(env) {
  const list = []
  if (env.GLOZ_OPENROUTER_KEY) list.push({ url: 'https://openrouter.ai/api/v1/chat/completions', key: env.GLOZ_OPENROUTER_KEY, model: env.GLOZ_OPENROUTER_MODEL || 'openrouter/auto' })
  if (env.GLOZ_ANTHROPIC_KEY) list.push({ url: 'https://api.anthropic.com/v1/messages', key: env.GLOZ_ANTHROPIC_KEY, model: env.GLOZ_ANTHROPIC_MODEL || 'claude-sonnet-5-5', anthropic: true })
  if (env.GLOZ_OPENAI_KEY) list.push({ url: 'https://api.openai.com/v1/chat/completions', key: env.GLOZ_OPENAI_KEY, model: env.GLOZ_OPENAI_MODEL || 'gpt-4.1-mini' })
  // The public demo's NEAR AI credit, under the same budget and hard stop as the drafts.
  if (env.GLOZ_NEARAI_KEY && !near.out) list.push({ url: 'https://cloud-api.near.ai/v1/chat/completions', key: env.GLOZ_NEARAI_KEY, model: env.GLOZ_NEARAI_MODEL || 'Qwen/Qwen3.6-35B-A3B-FP8', near: true })
  return list
}

async function call(p, system, messages) {
  const signal = AbortSignal.timeout(20000)
  if (p.anthropic) {
    const r = await fetch(p.url, { method: 'POST', signal, headers: { 'x-api-key': p.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 400, system, messages }) })
    if (!r.ok) throw new Error(`ai ${r.status}`)
    return (await r.json()).content.map(c => c.text || '').join('').trim()
  }
  const r = await fetch(p.url, { method: 'POST', signal, headers: { authorization: `Bearer ${p.key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 400, messages: [{ role: 'system', content: system }, ...messages], ...(p.url.includes('openrouter.ai') ? { provider: { data_collection: 'deny' } } : {}) }) })
  if (p.near && r.status === 402) near.out = true
  if (!r.ok) throw new Error(`ai ${r.status}`)
  const j = await r.json()
  if (p.near) near.add(j.usage)
  // A model that thinks out loud first: only what follows its thinking.
  return String(j.choices[0].message.content).replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

// body: { pcm: base64, lang, history: [{q, a}] } or { q } for a typed question.
export async function handle(body, { env, look = evidence, chats = [] }) {
  if (env.GLOZ_SAMPLE === '1') { if (body?.pcm) { let t = ''; try { t = (await transcribe(Buffer.from(String(body.pcm), 'base64'), String(body.lang || 'en'))).text } catch { return { error: 'No speech engine on the server' } } if (!String(t || '').trim()) return { error: 'Nothing heard' } } if (typeof body?.q === 'string' && body.q.trim()) return { q: body.q.trim(), a: 'Sample answer: with an AI key on the Gloz server, the real answer appears here.' }; return SAMPLE }
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
  // "How does example.com's search work?": the site's own code is read first, and the answer comes from it.
  const ev = await look(q)
  if (ev) messages[messages.length - 1] = { role: 'user', content: `${q}\n\nEvidence from ${ev.url}, its own code:\n${ev.text}` }
  // "What did Sam say about Friday?": the recent messages of the chats the wearer picked, so the answer comes from them.
  else if (chats.length) messages[messages.length - 1] = { role: 'user', content: `${q}\n\nRecent messages in the wearer's picked chats, oldest first:\n${chats.map(c => `[${c.chat}] ${c.from}: ${c.text}`).join('\n')}` }
  const system = `Answer the question for someone reading one line at a time on smart glasses. Answer in ${NAMES[lang] || lang}. Plain text, no lists or markdown, at most 60 words. If you do not know, say so.${ev ? ' Explain how the feature works from the evidence given, naming what in the code shows it; if the evidence does not show it, say so.' : ''}`
  const fromChats = !ev && chats.length ? ' If the question is about the wearer\'s messages, answer only from the messages given, in one line of at most 15 words; if they do not say, reply that the chats do not say.' : ''
  let last
  for (const p of list) {
    try { return { q, a: await call(p, system + fromChats, messages), by: p.model } } catch (e) { last = e }
  }
  return { q, error: `No answer: ${String(last?.message || 'AI unreachable').slice(0, 60)}` }
}
