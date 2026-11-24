// Checks the README setup steps on a fresh clone, in order:
//   1. Node 24 or newer   2. install   3. tests   4. app build and .ehpk
//   5. backend starts, answers /health, and pairs with its printed code
//   node scripts/check-setup.mjs
import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
let failed = 0
const ok = m => console.log(`PASS  ${m}`)
const fail = m => { console.log(`FAIL  ${m}`); failed++ }
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env, CI: '1' } }).toString()

const major = Number(process.versions.node.split('.')[0])
major >= 24 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node}: Gloz needs Node 24 or newer`)

try {
  if (!existsSync(`${root}/node_modules`)) sh('npm ci')
  if (!existsSync(`${root}/app/node_modules`)) sh('npm ci', `${root}/app`)
  ok('dependencies installed')
} catch (e) { fail(`npm ci: ${String(e.stderr || e).slice(0, 300)}`) }

try { const out = sh('npm test'); const m = out.match(/# pass (\d+)[\s\S]*# fail (\d+)/) || out.match(/ℹ pass (\d+)[\s\S]*ℹ fail (\d+)/); m && m[2] === '0' ? ok(`tests: ${m[1]} passed, 0 failed`) : fail('tests did not all pass') }
catch (e) { fail(`tests: ${String(e.stdout || e).slice(-400)}`) }

try { sh('npx tsc --noEmit && npx vite build', `${root}/app`); ok('app builds') } catch (e) { fail(`app build: ${String(e.stdout || e).slice(-300)}`) }
try { sh('npx -y @evenrealities/evenhub-cli@0.2.0 pack app.json dist -o gloz.ehpk --sdk-ver 0.0.16', `${root}/app`); existsSync(`${root}/app/gloz.ehpk`) ? ok('gloz.ehpk packed') : fail('no gloz.ehpk') }
catch (e) { fail(`pack: ${String(e.stdout || e).slice(-300)}`) }

// Backend: start it with no keys on a spare port, read the pairing code it prints, pair.
await new Promise(resolve => {
  const port = 18787
  const p = spawn(process.execPath, ['server/index.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), GLOZ_DATA: `${root}/server/data-check` } })
  let out = ''
  let seen = false
  // Wait for the backend to exit before going on: exiting while it closes crashes Node on Windows.
  const done = () => { p.once('exit', () => resolve()); p.kill() }
  const t = setTimeout(() => { fail('backend did not start in 20 s'); done() }, 20000)
  p.stdout.on('data', async d => {
    out += d
    const code = out.match(/Pairing code: (\d{6})/)?.[1]
    if (!code || seen) return
    seen = true
    clearTimeout(t)
    try {
      const h = await (await fetch(`http://127.0.0.1:${port}/health`)).json()
      h.ok ? ok(`backend up; services: ${h.connectors.join(', ') || 'none set yet'}; AI drafts: ${h.ai ? 'on' : 'holding replies'}`) : fail('health not ok')
      const r = await fetch(`http://127.0.0.1:${port}/pair`, { method: 'POST', body: JSON.stringify({ code }) })
      r.ok && (await r.json()).token ? ok('pairing code works') : fail('pairing failed')
    } catch (e) { fail(`backend: ${e.message}`) }
    done()
  })
})
try { sh(process.platform === 'win32' ? 'rmdir /s /q server\\data-check' : 'rm -rf server/data-check') } catch {}

console.log(failed ? `\n${failed} setup step(s) failed` : '\nsetup: every step passed')
process.exitCode = failed ? 1 : 0
