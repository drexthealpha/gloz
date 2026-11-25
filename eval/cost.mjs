// Cost of one AI draft, at most: the largest prompt Gloz can send (the draft rules, the chat name, 8 earlier
// messages and the new one, each at the 120-character test maximum, in the widest script) and the largest reply
// (25 words in the sender's language plus its meaning), with every byte counted as a token. Tokenizers never use
// more tokens than bytes, so the real cost is lower. Prices are read live from OpenRouter's public model list.
//   node eval/cost.mjs   writes eval/results/cost.json
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync(new URL('../app/src/core/prompt.ts', import.meta.url), 'utf8')
const system = src.match(/const DRAFT_SYSTEM = `([\s\S]*?)`/)[1].replace('WEARER_LANG', 'English')
const widest = 'ह'.repeat(120)                     // Devanagari: 3 bytes a character, the most in the test set
const user = ['Chat: a chat name of thirty characters', ...Array.from({ length: 9 }, () => `Sender Name: ${widest}`), 'Wearer gave no instruction.'].join('\n')
const reply = `{"reply": "${Array(25).fill('ह'.repeat(8)).join(' ')}", "gloss": "${Array(25).fill('word').join(' ')}"}`
const bytes = s => Buffer.byteLength(s, 'utf8')
const tokensIn = bytes(system) + bytes(user), tokensOut = bytes(reply)

const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'user-agent': 'Gloz/0.1' } })
const models = (await r.json()).data
const out = { read: new Date().toISOString().slice(0, 10), tokensInAtMost: tokensIn, tokensOutAtMost: tokensOut, modelsListed: models.length, models: {} }
for (const id of ['openai/gpt-4.1-mini', 'anthropic/claude-sonnet-4.5']) {
  const m = models.find(x => x.id === id)
  if (!m) continue
  const usd = tokensIn * Number(m.pricing.prompt) + tokensOut * Number(m.pricing.completion)
  out.models[id] = { usdPerDraftAtMost: Number(usd.toFixed(5)), draftsPerDollarAtLeast: Math.floor(1 / usd) }
}
writeFileSync(new URL('./results/cost.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(out)
