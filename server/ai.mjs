// Drafts and translations. Keys live only here, on the backend.
// Providers are tried in order; a failing one is skipped, so one outage
// does not stop drafts (complaint: "AI stops responding", server errors).
import { DRAFT_SYSTEM } from '../app/src/core/prompt.ts'
import { guessLang, NAMES, HOLDING } from './lang.mjs'

const env = process.env
function providers() {
  const list = []
  if (env.GLOZ_OPENROUTER_KEY) list.push({ name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: env.GLOZ_OPENROUTER_KEY, model: env.GLOZ_OPENROUTER_MODEL || 'openrouter/auto', kind: 'openai' })
  if (env.GLOZ_ANTHROPIC_KEY) list.push({ name: 'claude', url: 'https://api.anthropic.com/v1/messages', key: env.GLOZ_ANTHROPIC_KEY, model: env.GLOZ_ANTHROPIC_MODEL || 'claude-sonnet-5-5', kind: 'anthropic' })
  if (env.GLOZ_OPENAI_KEY) list.push({ name: 'chatgpt', url: 'https://api.openai.com/v1/chat/completions', key: env.GLOZ_OPENAI_KEY, model: env.GLOZ_OPENAI_MODEL || 'gpt-4.1-mini', kind: 'openai' })
  return list
}
export const aiReady = () => providers().length > 0

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
    const r = await fetch(p.url, { method: 'POST', signal: ctl.signal, headers: { authorization: `Bearer ${p.key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: p.model, max_tokens: 400, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) })
    if (!r.ok) throw new Error(`${p.name} ${r.status}`)
    const j = await r.json()
    return j.choices[0].message.content
  } finally { clearTimeout(t) }
}

async function ask(system, user) {
  let last
  for (const p of providers()) {
    try { return { text: await call(p, system, user), by: p.name } } catch (e) { last = e }
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
  return { text, gloss: j.gloss && rl !== myLang ? String(j.gloss).trim() : undefined, lang: rl, langName: NAMES[rl], by: 'ai' }
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
