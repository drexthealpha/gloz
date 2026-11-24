// Which characters of the evaluation set does the firmware font draw?
// Shows each character alone in a plain text container in the simulator and
// counts lit pixels. Writes eval/out/glyphs.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { startVite, startSim, waitUp, waitLog, input, frame, litIn, kill } from './sim.mjs'

const sets = ['heldout', 'dev'].map(n => JSON.parse(readFileSync(new URL(`./set/${n}.json`, import.meta.url), 'utf8')).items)
const chars = [...new Set(sets.flat().flatMap(i => [...i.expected.normalize('NFC')]).filter(c => c.trim()))].sort()
writeFileSync(new URL('../app/public/probe-chars.json', import.meta.url), JSON.stringify(chars))
console.log('distinct characters', chars.length)

const vite = startVite(5174)
await waitUp('http://localhost:5174/probe.html')
const sim = startSim('http://localhost:5174/probe.html')
const drawn = {}
try {
  await waitUp('http://127.0.0.1:9898/api/ping')
  const total = Math.ceil(chars.length / 8)
  for (let b = 0; b < total; b++) {
    await waitLog(`[probe] batch ${b} of`)
    await new Promise(r => setTimeout(r, 150))
    const f = await frame()
    for (let i = 0; i < 8; i++) {
      const c = chars[b * 8 + i]
      if (c === undefined) continue
      drawn[c] = litIn(f, (i % 4) * 144, Math.floor(i / 4) * 144, 144, 144)
    }
    if (b % 20 === 0) console.log('batch', b, 'of', total)
    await input('click')
  }
} finally { kill(sim); kill(vite) }

mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/glyphs.json', import.meta.url), JSON.stringify(drawn, null, 0))
const missing = Object.entries(drawn).filter(([, n]) => n === 0).map(([c]) => c)
console.log('drawn', chars.length - missing.length, 'missing', missing.length)
