// Drafts and translations. Keys live only here, on the backend.
// Providers are tried in order; a failing one is skipped, so one outage
// does not stop drafts (complaint: "AI stops responding", server errors).
import { DRAFT_SYSTEM } from '../app/src/core/prompt.ts'
import { guessLang, NAMES, HOLDING } from './lang.mjs'
import { createHash } from 'node:crypto'

const env = process.env
function providers() {
  const list = []
  if (env.GLOZ_OPENROUTER_KEY) list.push({ name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: env.GLOZ_OPENROUTER_KEY, model: env.GLOZ_OPENROUTER_MODEL || 'openrouter/auto', kind: 'openai' })
  if (env.GLOZ_ANTHROPIC_KEY) list.push({ name: 'claude', url: 'https://api.anthropic.com/v1/messages', key: env.GLOZ_ANTHROPIC_KEY, model: env.GLOZ_ANTHROPIC_MODEL || 'claude-sonnet-5-5', kind: 'anthropic' })
  if (env.GLOZ_OPENAI_KEY) list.push({ name: 'chatgpt', url: 'https://api.openai.com/v1/chat/completions', key: env.GLOZ_OPENAI_KEY, model: env.GLOZ_OPENAI_MODEL || 'gpt-4.1-mini', kind: 'openai' })
  // The public demo's provider: a fixed credit, so one small model, capped answers, and a hard stop (near below).
  if (env.GLOZ_NEARAI_KEY && !near.out) list.push({ name: 'nearai', url: 'https://cloud-api.near.ai/v1/chat/completions', key: env.GLOZ_NEARAI_KEY, model: env.GLOZ_NEARAI_MODEL || 'anthropic/claude-haiku-5-5', kind: 'openai' })
  return list
}
export const aiReady = () => providers().length > 0

// NEAR AI credit cannot be topped up: spend is counted from the tokens each answer reports, at the model's list
// price (USD per million tokens, input and output), and calls stop before the budget is gone, or at once when
// NEAR says the credit is used up. Then drafts are the holding reply.
export const near = {
  spent: 0, out: false,
  budget: Number(env.GLOZ_NEARAI_BUDGET_USD || 9.5),
  price: (env.GLOZ_NEARAI_PRICE || '0.10,0.50').split(',').map(Number),
  add(u) { if (!u) return; this.spent += ((u.prompt_tokens || 0) * this.price[0] + (u.completion_tokens || 0) * this.price[1]) / 1e6; if (this.spent >= this.budget) this.out = true },
}

// The same question gets the same answer without a second call: answers cached by a hash of what was asked.
const answers = new Map()
const MAX_ANSWERS = 5000
const keyOf = (p, system, user) => createHash('sha256').update(`${p.model}\n${system}\n${user}`).digest('hex')

async function call(p, system, user, timeoutMs = 15000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    if (p.kind === 'anthropic') {
      const r = await fetch(p.url, { method: 'POST', signal: ctl.signal, headers: { 'x-api-key': p.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 400, system, messages: [{ role: 'user', content: user }] }) })
      if (!r.ok) throw new Error(`${p.name} ${r.status}`)
      const j = await r.json()
      return j.content.map(c => c.text || '').join('')
    }
    const r = await fetch(p.url, { method: 'POST', signal: ctl.signal, headers: { authorization: `Bearer ${p.key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 400, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], ...(p.name === 'openrouter' ? { provider: { data_collection: 'deny' } } : {}) }) })
    // NEAR answers 402 when the credit is gone: never call it again.
    if (p.name === 'nearai' && r.status === 402) near.out = true
    if (!r.ok) throw new Error(`${p.name} ${r.status}`)
    const j = await r.json()
    if (p.name === 'nearai') near.add(j.usage)
    return j.choices[0].message.content
  } finally { clearTimeout(t) }
}

async function ask(system, user) {
  let last
  for (const p of providers()) {
    const k = keyOf(p, system, user)
    if (answers.has(k)) return { text: answers.get(k), by: p.name }
    try {
      const text = await call(p, system, user)
      answers.set(k, text)
      if (answers.size > MAX_ANSWERS) answers.delete(answers.keys().next().value)
      return { text, by: p.name }
    } catch (e) { last = e }
  }
  throw last || new Error('no AI provider')
}

function json(text) {
  const m = text.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : text)
}

// The draft rules live in one place, shared with the live demo.

// msg: { from, chat, text }; thread: earlier messages, oldest first; askText: what the wearer said.
export async function draft(msg, thread = [], askText = '', myLang = 'en') {
  const lang = guessLang(msg.text)
  if (!aiReady()) {
    const text = HOLDING[lang] || HOLDING.en
    return { text, gloss: lang === myLang ? undefined : HOLDING[myLang] || HOLDING.en, lang: guessLang(text), langName: NAMES[guessLang(text)], by: 'default' }
  }
  const user = [
    `Chat: ${msg.chat}`,
    ...thread.slice(-8).map(t => `${t.from}: ${t.text}`),
    `${msg.from}: ${msg.text}`,
    askText ? `Wearer's instruction: ${askText}` : 'Wearer gave no instruction.',
  ].join('\n')
  // Every provider failing (server errors, no signal) still leaves a reply to send: the holding reply.
  let out
  try { out = await ask(DRAFT_SYSTEM.replace('WEARER_LANG', NAMES[myLang] || myLang), user) } catch {
    const text = HOLDING[lang] || HOLDING.en
    return { text, gloss: lang === myLang ? undefined : HOLDING[myLang] || HOLDING.en, lang: guessLang(text), langName: NAMES[guessLang(text)], by: 'default' }
  }
  const j = json(out.text)
  const text = String(j.reply).trim()
  const rl = guessLang(text)
  const gloss = j.gloss && rl !== myLang ? String(j.gloss).trim() : undefined
  // Up to three replies to pick from with a swipe or the ring: the first, then the AI's alternatives.
  const alts = [{ text, gloss }, ...(Array.isArray(j.alts) ? j.alts : []).filter(a => a && String(a.reply || '').trim()).slice(0, 2)
    .map(a => ({ text: String(a.reply).trim(), gloss: a.gloss && guessLang(String(a.reply)) !== myLang ? String(a.gloss).trim() : undefined }))]
  const score = Math.max(1, Math.min(5, Math.round(Number(j.importance)) || 3))
  const line = j.line ? String(j.line).trim() : undefined
  const meaning = j.meaning && guessLang(msg.text) !== myLang ? String(j.meaning).trim() : undefined
  return { text, gloss, lang: rl, langName: NAMES[rl], by: 'ai', score, line, meaning, ...(alts.length > 1 && !askText ? { alts } : {}) }
}

export async function translate(text, myLang = 'en') {
  if (!aiReady() || guessLang(text) === myLang) return undefined
  const out = await ask(`Translate the message into ${NAMES[myLang] || myLang}. Return only the translation.`, text)
  return out.text.trim()
}

// One sentence for a long message, in the wearer's language, shown before the full text.
export async function brief(text, myLang = 'en') {
  if (!aiReady() || [...text].length <= 280) return undefined
  const out = await ask(`Say what this message wants from the reader in one sentence of at most 20 words, in ${NAMES[myLang] || myLang}. Return only the sentence.`, text)
  return out.text.trim()
}
