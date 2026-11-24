// Writes real AI drafts for the live demo's sample messages, using the backend's
// own draft code and whatever AI key is in .env. Run once a key is set:
//   node --env-file=.env scripts/demo-drafts.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import * as ai from '../server/ai.mjs'

if (!ai.aiReady()) { console.log('No AI key in the environment; nothing written.'); process.exit(1) }
const path = new URL('../app/src/demo-inbox.json', import.meta.url)
const list = JSON.parse(readFileSync(path, 'utf8'))
for (const m of list) {
  const d = await ai.draft(m, [], '', 'en')
  m.draft = d.text
  m.gloss = d.gloss
  m.draftLang = d.lang
  console.log(m.id, m.lang, '->', d.text)
}
writeFileSync(path, JSON.stringify(list, null, 1) + '\n')
