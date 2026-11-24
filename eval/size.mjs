// Complaint 27: how much bigger can Gloz draw text than the glasses' own font?
// Draws "H" in a plain firmware text container and with Gloz at sizes 1 to 6 in
// the simulator, and measures the lit height of the letter in the framebuffer.
//   node eval/size.mjs   writes eval/results/size.json
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import { startVite, startSim, waitUp, waitLog, frame, kill } from './sim.mjs'

function inkHeight(f) {
  let top = -1, bottom = -1
  for (let y = 0; y < f.height; y++) {
    let lit = false
    for (let x = 0; x < f.width; x++) if (f.alpha[y * f.width + x] > 0) { lit = true; break }
    if (lit) { if (top < 0) top = y; bottom = y }
  }
  return top < 0 ? 0 : bottom - top + 1
}

let cmd = { n: -1 }
const srv = createServer((q, s) => { s.setHeader('Access-Control-Allow-Origin', '*'); s.end(JSON.stringify(cmd)) }).listen(8799)
let n = 0
async function show(c) { cmd = { ...c, n: ++n }; await waitLog(`[eval] ready ${n} `, 30000); await new Promise(r => setTimeout(r, 150)); return frame() }

const vite = startVite(5174)
await waitUp('http://localhost:5174/eval.html')
const sim = startSim('http://localhost:5174/eval.html')
const out = {}
try {
  await waitUp('http://127.0.0.1:9898/api/ping')
  await waitLog('[eval] up', 60000)
  out.plain = inkHeight(await show({ arm: 'plain', text: 'H' }))
  out.gloz = {}
  for (let s = 1; s <= 6; s++) out.gloz[s] = inkHeight(await show({ arm: 'gloz', text: 'H', size: s, line: 0 }))
} finally { kill(sim); kill(vite); srv.close() }
out.ratio = Number((out.gloz[6] / out.plain).toFixed(2))
out.note = 'lit pixel height of a capital H in the simulator framebuffer'
writeFileSync(new URL('./results/size.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(out)
