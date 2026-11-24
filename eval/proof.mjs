// Saves real simulator frames of the same held-out messages, shown as plain G2
// text and by Gloz, for the demo page: app/demo-public/proof/<lang>-plain.png, -gloz.png
//   node eval/proof.mjs
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'
import { startVite, startSim, waitUp, waitLog, frame, kill } from './sim.mjs'

const items = JSON.parse(readFileSync(new URL('./set/heldout.json', import.meta.url), 'utf8')).items
const pick = ['tha', 'ara', 'hin', 'heb', 'pes'].map(l => items.find(i => i.lang === l))

// Lit pixels as green on black, the way the glasses show them.
function green(f) {
  const png = new PNG({ width: f.width, height: f.height })
  for (let i = 0; i < f.alpha.length; i++) { png.data[i * 4] = 0; png.data[i * 4 + 1] = f.alpha[i]; png.data[i * 4 + 2] = Math.round(f.alpha[i] * 0.35); png.data[i * 4 + 3] = 255 }
  return PNG.sync.write(png)
}

let cmd = { n: -1 }
const srv = createServer((q, s) => { s.setHeader('Access-Control-Allow-Origin', '*'); s.end(JSON.stringify(cmd)) }).listen(8799)
let n = 0
async function show(c) {
  cmd = { ...c, n: ++n }
  const m = await waitLog(`[eval] ready ${n} `, 30000)
  await new Promise(r => setTimeout(r, 150))
  return Object.assign(await frame(), { lines: Number(m.match(/lines (\d+)/)?.[1] ?? 1) })
}

const dir = new URL('../app/demo-public/proof/', import.meta.url)
mkdirSync(dir, { recursive: true })
const vite = startVite(5174)
await waitUp('http://localhost:5174/eval.html')
const sim = startSim('http://localhost:5174/eval.html')
const list = []
try {
  await waitUp('http://127.0.0.1:9898/api/ping')
  await waitLog('[eval] up', 60000)
  for (const it of pick) {
    writeFileSync(new URL(`${it.lang}-plain.png`, dir), green(await show({ arm: 'plain', text: it.expected })))
    // Every page Gloz draws for the message, so the demo shows all of it.
    let pages = 0
    for (let line = 0, total = 1; line < total; line++) {
      const f = await show({ arm: 'gloz', text: it.expected, size: 3, line })
      total = f.lines
      writeFileSync(new URL(`${it.lang}-gloz${line ? '-' + (line + 1) : ''}.png`, dir), green(f))
      pages = line + 1
    }
    list.push({ lang: it.lang, script: it.script, id: it.tatoeba_id, text: it.expected, pages })
  }
} finally { kill(sim); kill(vite); srv.close() }
writeFileSync(new URL('proof.json', dir), JSON.stringify(list, null, 1) + '\n')
console.log('saved', list.length, 'pairs to app/demo-public/proof/')
