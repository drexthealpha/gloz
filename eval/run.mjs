// Runs the locked evaluation in eval/PROTOCOL.md through the Even Hub simulator.
//   node eval/run.mjs [heldout|dev] [--limit N]
// Writes eval/results/<set>.json and eval/results/<set>.md
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'
import { createWorker } from 'tesseract.js'
import { startVite, startSim, waitUp, waitLog, frame, kill } from './sim.mjs'
import * as OpenCC from 'opencc-js'
import { execSync } from 'node:child_process'

// The commit this run measured, written into its results, so a result is never read against other code.
const COMMIT = (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim() } catch { return null } })()

const SET = process.argv[2] || 'heldout'
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1]
const LIMIT = Number(arg('limit') || 0)
const PER_SCRIPT = Number(arg('per-script') || 0)
const OUT = arg('out') || SET
const SAVE = process.argv.includes('--save')
const SIZE = 3
const LADDER = [0, 1, 1.5, 2, 3, 4, 5, 6, 8]
const PASS = 0.10
const OCR_LANG = { ara: 'ara', pes: 'fas', hin: 'hin', tha: 'tha', heb: 'heb', jpn: 'jpn', kor: 'kor', cmn: 'chi_sim+chi_tra', rus: 'rus', eng: 'eng' }

let items = JSON.parse(readFileSync(new URL(`./set/${SET}.json`, import.meta.url), 'utf8')).items
if (PER_SCRIPT) items = items.filter((it, i, a) => a.slice(0, i).filter(x => x.lang === it.lang).length < PER_SCRIPT)
items = items.slice(0, LIMIT || undefined)

// --- reading ---------------------------------------------------------------
function blur(a, w, h, r) {
  if (!r) return Float32Array.from(a)
  const rad = Math.ceil(r * 3), k = []
  for (let i = -rad; i <= rad; i++) k.push(Math.exp(-(i * i) / (2 * r * r)))
  const s = k.reduce((x, y) => x + y)
  const kk = k.map(v => v / s)
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0
    for (let i = -rad; i <= rad; i++) v += a[y * w + Math.min(w - 1, Math.max(0, x + i))] * kk[i + rad]
    tmp[y * w + x] = v
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0
    for (let i = -rad; i <= rad; i++) v += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * kk[i + rad]
    out[y * w + x] = v
  }
  return out
}

// Black ink on white, scaled up 3 times, as PNG for the OCR engine.
function toPng(f, r, S = 3) {
  const b = blur(f.alpha, f.width, f.height, r)
  const W = f.width * S, H = f.height * S
  const png = new PNG({ width: W, height: H })
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = 255 - Math.min(255, b[Math.floor(y / S) * f.width + Math.floor(x / S)])
    const o = (y * W + x) * 4
    png.data[o] = png.data[o + 1] = png.data[o + 2] = v
    png.data[o + 3] = 255
  }
  return PNG.sync.write(png)
}

function lev(a, b) {
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
// Tesseract writes simplified Chinese for traditional text, so both texts go through
// the same traditional-to-simplified table before scoring (amendment 5).
const toCn = OpenCC.Converter({ from: 'tw', to: 'cn' })
const norm = s => [...toCn(s.normalize('NFC')).replace(/\s+/g, '')]
export const cer = (expected, read) => { const e = norm(expected), r = norm(read); return e.length ? lev(e, r) / e.length : 0 }

// --- driving ---------------------------------------------------------------
let cmd = { n: -1 }
const srv = createServer((q, s) => { s.setHeader('Access-Control-Allow-Origin', '*'); s.end(JSON.stringify(cmd)) }).listen(8799)
let n = 0
// The framebuffer is read only once it has changed from the screen before and then
// stayed the same for 250 ms: a page switch can take longer than the call that asks
// for it (amendment 4).
let prevFrame = null
const same = (a, b) => Boolean(a && b) && a.alpha.length === b.alpha.length && a.alpha.every((v, i) => v === b.alpha[i])
async function settled() {
  const end = Date.now() + 6000
  let last = await frame()
  while (Date.now() < end) {
    await new Promise(r => setTimeout(r, 250))
    const f = await frame()
    if (same(f, last) && !same(f, prevFrame)) { prevFrame = f; return f }
    last = f
  }
  prevFrame = last
  return last
}
async function show(c) {
  cmd = { ...c, n: ++n }
  const msg = await waitLog(`[eval] ready ${n} `, 30000)
  return { f: await settled(), lines: Number(msg.split('lines ')[1]) }
}

// Start to first line, in ms from page start in the simulator. Android's vitals call a cold start of 5 s or more excessive;
// the CI run fails above that (D8: speed is retention, test it in the first minute).
const FIRST_LINE_MAX_MS = 5000
let firstLineMs = null
const vite = startVite(5174)
await waitUp('http://localhost:5174/eval.html')
// Warm the dev server first: every module the page imports is fetched once, so Vite's one-time compile of the
// project and its dependencies is done before the clock starts. The start-to-first-line time is then the app's own,
// as a built app has no such compile.
{
  const seen = new Set(), todo = ['/eval.html']
  for (let k = 0; k < 2; k++) {
    seen.clear(); todo.push('/eval.html')
    while (todo.length) {
      const p = todo.pop()
      if (seen.has(p)) continue
      seen.add(p)
      const t = await fetch('http://localhost:5174' + p).then(r => r.text()).catch(() => '')
      for (const m of t.matchAll(/(?:from|import|src=)\s*\(?["'](\/[^"']+)["']/g)) todo.push(m[1])
    }
    // A first compile can find new dependencies and rebuild them; the second pass waits for that.
    await new Promise(r => setTimeout(r, 1500))
  }
  console.log(`dev server warmed: ${seen.size} modules`)
}
const sim = startSim('http://localhost:5174/eval.html')
const workers = {}
// Model downloads can fail on a bad network; try again before giving up.
async function worker(lang) {
  for (let k = 1; ; k++) {
    try {
      const w = await createWorker(lang.split('+'), 1, { cachePath: new URL('./out/tessdata', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') })
      await w.setParameters({ tessedit_pageseg_mode: '6' })
      return w
    } catch (e) { if (k >= 6) throw e; console.log('model download failed, retry', k); await new Promise(r => setTimeout(r, 5000 * k)) }
  }
}
// Rows are saved after each message, so a stopped run resumes where it stopped.
const partial = new URL(`./out/${OUT}.partial.json`, import.meta.url)
const results = (() => { try { return JSON.parse(readFileSync(partial, 'utf8')) } catch { return [] } })()
const done = new Set(results.map(r => `${r.lang}:${r.id}`))
try {
  await waitUp('http://127.0.0.1:9898/api/ping')
  const bridgeMs = Number((await waitLog('[eval] bridge ', 60000)).split('[eval] bridge ')[1].split(' ')[0])
  const first = await waitLog('[eval] first line ', 60000)
  firstLineMs = Number(first.split('[eval] first line ')[1].split(' ')[0])
  console.log(`start to first line: ${firstLineMs} ms`)
  // node eval/run.mjs heldout --first-line: only this measure, written to eval/results/first-line.json.
  if (process.argv.includes('--first-line')) {
    kill(sim); kill(vite)
    mkdirSync(new URL('./results/', import.meta.url), { recursive: true })
    writeFileSync(new URL('./results/first-line.json', import.meta.url), JSON.stringify({ commit: COMMIT, what: 'page start to the first Gloz line on the glasses, in the Even Hub simulator, dev server warmed', firstLineMs, bridgeMs, budgetMs: FIRST_LINE_MAX_MS, read: new Date().toISOString().slice(0, 10) }, null, 1) + '\n')
    process.exit(firstLineMs <= FIRST_LINE_MAX_MS ? 0 : 1)
  }
  await waitLog('[eval] up', 60000)
  for (const it of items) {
    const lang = OCR_LANG[it.lang]
    if (done.has(`${it.lang}:${it.tatoeba_id}`)) continue
    if (!workers[lang]) workers[lang] = await worker(lang)
    // Each screen is read at 1, 2 and 3 times scale and the reading the OCR
    // engine is most confident in is kept, for both arms alike. The expected
    // text is never used to choose (PROTOCOL.md, amendment 1).
    const ocr = async (f, r) => {
      let best = null
      for (const S of [1, 2, 3]) {
        const d = (await workers[lang].recognize(toPng(f, r, S))).data
        const t = d.text.trim()
        const conf = t ? d.confidence : -1
        if (!best || conf > best.conf) best = { t, conf }
      }
      return best.t
    }
    const row = { lang: it.lang, script: it.script, id: it.tatoeba_id, expected: it.expected }
    // Largest blur on the ladder at which the message is still shown (amendment 2).
    async function survive(frames) {
      let best = -1, sharp = ''
      for (const r of LADDER) {
        const parts = []
        for (const f of frames) parts.push(await ocr(f, r))
        const text = parts.join(' ')
        if (r === 0) sharp = text
        if (cer(it.expected, text) > PASS) break
        best = r
      }
      return { survive: best, A: sharp, cerA: Number(cer(it.expected, sharp).toFixed(4)) }
    }
    const p = await show({ arm: 'plain', text: it.expected })
    row.plain = await survive([p.f])
    const first = await show({ arm: 'gloz', text: it.expected, size: SIZE, line: 0 })
    const frames = [first.f]
    for (let k = 1; k < first.lines; k++) frames.push((await show({ arm: 'gloz', text: it.expected, size: SIZE, line: k })).f)
    row.gloz = { ...(await survive(frames)), screens: frames.length }
    if (SAVE) { mkdirSync(new URL('./out/frames/', import.meta.url), { recursive: true }); frames.forEach((f, k) => writeFileSync(new URL(`./out/frames/${it.lang}-${it.tatoeba_id}-gloz-${k}.png`, import.meta.url), toPng(f, 0))); writeFileSync(new URL(`./out/frames/${it.lang}-${it.tatoeba_id}-plain.png`, import.meta.url), toPng(p.f, 0)) }
    results.push(row)
    mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
    writeFileSync(partial, JSON.stringify(results))
    console.log(it.lang, it.tatoeba_id, 'plain', row.plain.survive, 'gloz', row.gloz.survive)
  }
} finally {
  for (const w of Object.values(workers)) await w.terminate()
  kill(sim); kill(vite); srv.close()
}

// --- scoring ---------------------------------------------------------------
const median = a => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 }
const by = {}
for (const r of results) {
  const s = (by[r.script] ??= { n: 0, plain: [], gloz: [], plainA: 0, glozA: 0 })
  s.n++
  s.plain.push(r.plain.survive); s.gloz.push(r.gloz.survive)
  if (r.plain.cerA <= PASS) s.plainA++
  if (r.gloz.cerA <= PASS) s.glozA++
}
mkdirSync(new URL('./results/', import.meta.url), { recursive: true })
let md = `| Script | Plain: blur survived (median px) | Gloz: blur survived (median px) | Plain: shown, sharp | Gloz: shown, sharp | Gloz wins |
|---|---|---|---|---|---|
`
let wins = 0
const fmt = v => v < 0 ? 'not shown' : `${v}`
for (const [k, s] of Object.entries(by)) {
  s.plainMedian = median(s.plain); s.glozMedian = median(s.gloz)
  const w = s.glozMedian > s.plainMedian
  if (w) wins++
  md += `| ${k} | ${fmt(s.plainMedian)} | ${fmt(s.glozMedian)} | ${s.plainA}/${s.n} | ${s.glozA}/${s.n} | ${w ? 'yes' : 'no'} |
`
}
md += `
Scripts won: ${wins} of ${Object.keys(by).length}. Shown means a character error rate of at most ${PASS}. Blur ladder: ${LADDER.join(', ')} px. Protocol: eval/PROTOCOL.md.
`
writeFileSync(new URL(`./results/${OUT}.json`, import.meta.url), JSON.stringify({ protocol: 'eval/PROTOCOL.md', commit: COMMIT, firstLineMs, size: SIZE, ladder: LADDER, pass: PASS, wins, by, results }, null, 1) + '\n')
writeFileSync(new URL(`./results/${OUT}.md`, import.meta.url), md)
console.log(md)
// The CI run, one held-out message per script, checked against the committed held-out run: a message the held-out
// run showed sharp that this build no longer shows fails, so the headline result stays true of the code being shipped.
if (OUT === 'ci') {
  const was = JSON.parse(readFileSync(new URL('./results/heldout.json', import.meta.url), 'utf8')).results
  const lost = []
  for (const r of results) {
    const h = was.find(x => x.lang === r.lang && x.id === r.id)
    if (!h) continue
    const then = h.gloz.cerA <= PASS, now = r.gloz.cerA <= PASS
    console.log(`${r.script}: held-out run ${then ? 'shown' : 'not shown'}, this build ${now ? 'shown' : 'not shown'}`)
    if (then && !now) lost.push(r.script)
  }
  if (lost.length) { console.log(`this build no longer shows what the held-out run showed in: ${lost.join(', ')}`); process.exit(1) }
}
// The time gate: a start slower than the budget fails the run (and the CI job that runs it).
if (firstLineMs == null || firstLineMs > FIRST_LINE_MAX_MS) { console.log(`start to first line ${firstLineMs} ms: over the ${FIRST_LINE_MAX_MS} ms budget`); process.exit(1) }
console.log(`start to first line ${firstLineMs} ms, within the ${FIRST_LINE_MAX_MS} ms budget`)
