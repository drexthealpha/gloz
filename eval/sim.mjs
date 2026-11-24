// Helpers that drive the Even Hub simulator through its automation API
// (https://hub.evenrealities.com/docs/test/simulator, "Headless automation").
import { spawn, execSync, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { PNG } from 'pngjs'

export const SIM = 'http://127.0.0.1:9898'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const appDir = new URL('../app/', import.meta.url)
export function startVite(port = 5174) {
  return spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' })
}

// The simulator's own launcher, run with node directly so it can be stopped cleanly.
const simBin = process.env.EVENHUB_SIM_BIN || join(execSync('npm root -g').toString().trim(), '@evenrealities', 'evenhub-simulator', 'bin', 'index.js')
export function startSim(url, port = 9898) {
  return spawn(process.execPath, [simBin, url, '--automation-port', String(port), '--no-glow'], { stdio: 'ignore' })
}

export async function waitUp(url, ms = 60000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.ok) return } catch {}
    await sleep(300)
  }
  throw new Error('not up: ' + url)
}

let since = 0
export async function waitLog(marker, ms = 30000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const r = await (await fetch(`${SIM}/api/console?since_id=${since}`)).json()
    for (const e of r.entries || []) {
      since = Math.max(since, e.id)
      const msg = e.message ?? e.text ?? JSON.stringify(e)
      if (msg.includes(marker)) return msg
    }
    await sleep(100)
  }
  throw new Error('no log: ' + marker)
}

export async function input(action) {
  const r = await fetch(`${SIM}/api/input`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
  if (!r.ok) throw new Error('input ' + action + ' ' + r.status)
}

// Returns { width, height, alpha: Uint8Array } for the 576 x 288 framebuffer.
export async function frame() {
  const buf = Buffer.from(await (await fetch(`${SIM}/api/screenshot/glasses`)).arrayBuffer())
  const png = PNG.sync.read(buf)
  const alpha = new Uint8Array(png.width * png.height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = png.data[i * 4 + 3]
  return { width: png.width, height: png.height, alpha }
}

export function litIn(f, x, y, w, h) {
  let n = 0
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (f.alpha[j * f.width + i] > 0) n++
  return n
}

export function kill(p) {
  if (!p || p.exitCode !== null) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/t', '/f'], { stdio: 'ignore' })
  else { try { process.kill(-p.pid) } catch {} p.kill('SIGTERM') }
}
