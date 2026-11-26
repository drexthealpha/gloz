// Records the demo video in the Even Hub simulator: the real app, the real backend
// with the labelled sample service, driven through the simulator's automation API.
// Each scene's glasses frames are captured and joined with one caption line each.
//   node scripts/video.mjs    writes out/gloz-demo.mp4 (needs ffmpeg and the simulator)
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { startSim, waitUp, waitLog, input, kill, SIM } from '../eval/sim.mjs'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const OUT = join(ROOT, 'out', 'video')
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
// A file path as ffmpeg's filter syntax wants it: forward slashes, the drive colon escaped.
const esc = f => f.split(String.fromCharCode(92)).join('/').replace(':', String.fromCharCode(92) + ':')
const CODE = '246810'
const FONT = process.platform === 'win32' ? 'C\\:/Windows/Fonts/segoeui.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

function backend() {
  return spawn(process.execPath, ['server/index.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '8787', GLOZ_SAMPLE: '1', GLOZ_PAIR_CODE: CODE, GLOZ_DATA: join(OUT, 'data') }, stdio: 'ignore' })
}

const scenes = []
async function scene(caption, ms, during) {
  const dir = join(OUT, `s${String(scenes.length).padStart(2, '0')}`)
  mkdirSync(dir)
  let k = 0, live = true
  const grab = (async () => {
    while (live) {
      const buf = Buffer.from(await (await fetch(`${SIM}/api/screenshot/glasses`)).arrayBuffer())
      writeFileSync(join(dir, `${String(k++).padStart(4, '0')}.png`), buf)
      await sleep(200)
    }
  })()
  if (during) await during()
  await sleep(ms)
  live = false
  await grab
  scenes.push({ dir, caption, frames: k })
}

let be = backend()
await waitUp('http://127.0.0.1:8787/health')
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5173', '--strictPort'], { cwd: join(ROOT, 'app'), stdio: 'ignore' })
await waitUp('http://localhost:5173/')
const sim = startSim(`http://localhost:5173/?backend=http://127.0.0.1:8787&code=${CODE}`)
try {
  await waitUp(`${SIM}/api/ping`)
  await waitLog('[gloz] ready', 60000)
  await sleep(2500)
  await scene('A new message on the glasses. Plain G2 text drops Arabic; Gloz draws it, one line at a time.', 7000)
  await scene('Tap: the reply an AI drafted, shown in your language.', 4500, () => input('click'))
  await scene('Swipe or the ring: another reply, then a third. Pick one.', 6000, async () => { await input('down'); await sleep(2500); await input('down') })
  await scene('Tap: the reply on screen is sent, in Arabic. The next message comes up.', 4500, () => input('click'))
  await scene('Persian. Lines move on at reading pace; swipe to go faster.', 6000)
  await scene('Tap, tap: answered.', 5000, async () => { await input('click'); await sleep(2000); await input('click') })
  await scene('Hindi.', 5000)
  await scene('Swipe past the reply: left for later.', 4000, async () => { await input('down'); await sleep(1500); await input('down') })
  await scene('Thai.', 5000)
  await scene('No signal: the reply is saved on the phone.', 5000, async () => { kill(be); await sleep(500); await input('click'); await sleep(1500); await input('click') })
  await scene('The link is back: the saved reply goes out by itself, and the next message is up.', 7000, async () => { be = backend() })
  await scene('Hebrew, Japanese, Korean, Chinese, Russian, English: every script the phone can draw.', 8000)
  // One product: past the last message, the same line shows your day; tap opens what is behind it.
  await scene('Swipe past the rest: the inbox is done.', 14000, async () => { for (let k = 0; k < 6; k++) { await input('down'); await sleep(2300) } })
  await scene('Then your day, on the same line: meetings, tasks, weather, music, notes.', 9000, async () => { for (let k = 0; k < 3; k++) { await input('down'); await sleep(2200) } })
  await scene('Tap opens it. Hold and say anything: a task, a note, directions, a question.', 5000, () => input('click'))
  await scene('Double tap: home.', 3500, () => input('double_click'))
  await scene('Double tap at home: Gloz closes.', 3500, () => input('double_click'))
} finally { kill(sim); kill(vite); kill(be) }

// Join: each scene's frames over black, scaled 2x, with its caption under the glasses.
const parts = []
// Opening: the same Thai message in the same simulator, plain G2 text beside Gloz.
{
  const p = join(ROOT, 'app', 'demo-public', 'proof')
  const txt = join(OUT, 'c-open.txt')
  writeFileSync(txt, 'The same Thai message in the Even Hub simulator. Left: plain G2 text. Right: Gloz.')
  const mp4 = join(OUT, 'p-open.mp4')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-t', '5', '-i', join(p, 'tha-plain.png'), '-loop', '1', '-t', '5', '-i', join(p, 'tha-gloz.png'), '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=25',
    '-filter_complex', `[0]scale=600:300,pad=604:304:2:2:color=0x1f6f3a[a];[1]scale=600:300,pad=604:304:2:2:color=0x1f6f3a[b];[2][a]overlay=26:200:shortest=1[x];[x][b]overlay=650:200,drawtext=fontfile='${FONT}':textfile='${esc(txt)}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=600,format=yuv420p`,
    '-t', '5', '-r', '25', mp4])
  parts.push(mp4)
}
for (const [i, s] of scenes.entries()) {
  if (!s.frames) continue
  const txt = join(OUT, `c${i}.txt`)
  writeFileSync(txt, s.caption)
  const mp4 = join(OUT, `p${i}.mp4`)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '5', '-i', join(s.dir, '%04d.png'), '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=25',
    '-filter_complex', `[0]scale=1152:576:flags=neighbor[g];[1][g]overlay=64:40:shortest=1,drawtext=fontfile='${FONT}':textfile='${esc(txt)}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=650,format=yuv420p`,
    '-r', '25', mp4])
  parts.push(mp4)
}
// Closing: the measured results, from eval/results.
{
  const h = JSON.parse(readFileSync(join(ROOT, 'eval', 'results', 'heldout.json'), 'utf8'))
  const t = JSON.parse(readFileSync(join(ROOT, 'eval', 'results', 'time.json'), 'utf8'))
  const five = ['Arabic', 'Persian', 'Hindi', 'Thai', 'Hebrew']
  const g = five.reduce((n, k) => n + h.by[k].glozA, 0), p = five.reduce((n, k) => n + h.by[k].plainA, 0)
  const lines = [`200 held-out messages, 10 scripts, in the Even Hub simulator:`, `Arabic, Persian, Hindi, Thai, Hebrew shown: plain G2 text ${p} of 100, Gloz ${g} of 100.`, `Scripts where Gloz is read with weaker eyesight than plain text: ${h.wins} of 10.`, `Message seen to reply sent: ${t.plainMedian.toFixed(1)} s spoken in full, ${t.glozMedian.toFixed(1)} s with Gloz.`, 'github.com/drexthealpha/gloz']
  const txt = join(OUT, 'c-end.txt')
  writeFileSync(txt, lines.join('\n'))
  const mp4 = join(OUT, 'p-end.mp4')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=25', '-t', '8',
    '-vf', `drawtext=fontfile='${FONT}':textfile='${esc(txt)}':fontcolor=0x3dff7a:fontsize=32:line_spacing=18:x=80:y=200,format=yuv420p`, mp4])
  parts.push(mp4)
}
const list = join(OUT, 'list.txt')
writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'))
mkdirSync(join(ROOT, 'out'), { recursive: true })
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', join(ROOT, 'out', 'gloz-demo.mp4')])
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(ROOT, 'out', 'gloz-demo.mp4')]).toString().trim()
console.log('video: out/gloz-demo.mp4,', Number(dur).toFixed(1), 's')
writeFileSync(join(ROOT, 'eval', 'results', 'video.json'), JSON.stringify({ seconds: Math.round(Number(dur)), measured: 'ffprobe on out/gloz-demo.mp4' }, null, 1) + '\n')
