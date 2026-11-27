// Starts the Gloz backend: node server/index.mjs
// Settings come from the environment (see .env.example). Nothing secret is printed.
import { createApp } from './app.mjs'
import { connectors } from './connectors.mjs'
import * as ai from './ai.mjs'
import * as stt from './stt.mjs'

const port = Number(process.env.PORT || 8787)
const app = createApp({
  connectors: connectors(),
  ai: { ready: ai.aiReady, provider: ai.aiProvider, draft: ai.draft, translate: ai.translate },
  stt: { ready: stt.sttReady, transcribe: stt.transcribe },
  dataDir: process.env.GLOZ_DATA || new URL('./data/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'),
})
app.server.listen(port, () => {
  console.log(`Gloz backend on port ${port}`)
  console.log(`Pairing code: ${app.pairCode()}  (type it into Gloz on the phone)`)
  console.log(`Connected services: ${connectors().map(c => c.name).join(', ') || 'none yet, see .env.example'}`)
  console.log(`AI drafts: ${ai.aiReady() ? 'on' : 'holding replies only (no AI key set)'}`)
})
app.startPolling()
