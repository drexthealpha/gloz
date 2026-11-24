// Terminal: run one command on this Gloz server and send back its output as lines.
// Off unless GLOZ_TERMINAL=1. Only command names in GLOZ_TERMINAL_ALLOW (comma-separated) run,
// with no shell (execFile, arguments split on spaces), a 10 s limit and 20,000 characters of output.
// body: { op: 'list' } -> { on, allow }
//       { op: 'say', pcm: base64, lang } -> { cmd }      (the spoken command, not run)
//       { op: 'run', cmd } -> { lines, code, cut, timedOut, ms, startMs }
import { execFile } from 'node:child_process'
import { transcribe } from '../stt.mjs'

const LIMIT_MS = 10000
const MAX_CHARS = 20000

export const SAMPLE_LIST = { on: true, allow: ['uptime', 'df', 'git'], sample: true }
export const SAMPLE_RUN = { lines: [' 10:42:07 up 3 days,  2:11,  1 user,  load average: 0.08, 0.12, 0.10', 'exit 0'], code: 0, cut: false, timedOut: false, ms: 9, startMs: 3, sample: true }

const allowed = env => String(env.GLOZ_TERMINAL_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean)

// "Git status." -> "git status"
export function spoken(text) {
  const t = String(text).trim().replace(/[.?!,]+$/, '')
  const [name, ...rest] = t.split(/\s+/)
  return [name.toLowerCase(), ...rest].join(' ').trim()
}

// stt and run are the server's speech to text and execFile; tests pass stand-ins.
export async function handle(body, { env, stt = transcribe, run = execFile }) {
  const op = body?.op
  if (env.GLOZ_SAMPLE === '1') return op === 'run' ? SAMPLE_RUN : op === 'say' ? { cmd: 'uptime', sample: true } : SAMPLE_LIST
  if (env.GLOZ_TERMINAL !== '1') return { on: false }
  const allow = allowed(env)
  if (op === 'list') return { on: true, allow }
  if (op === 'say') {
    let text
    try { text = (await stt(Buffer.from(String(body.pcm || ''), 'base64'), String(body.lang || 'en'))).text } catch { return { error: 'Speech to text is not set up on the Gloz server' } }
    const cmd = spoken(text || '')
    if (!cmd) return { error: 'Nothing heard' }
    const name = cmd.split(' ')[0]
    return allow.includes(name) ? { cmd } : { error: `Not allowed: ${name}`.slice(0, 60) }
  }
  if (op === 'run') {
    const [name, ...args] = String(body.cmd || '').trim().split(/\s+/)
    if (!name || !allow.includes(name)) return { error: `Not allowed: ${name || 'nothing'}`.slice(0, 60) }
    const t0 = performance.now()
    let startMs = -1
    return await new Promise(done => {
      const child = run(name, args, { timeout: LIMIT_MS, maxBuffer: 4 * MAX_CHARS, windowsHide: true, shell: false }, (err, stdout, stderr) => {
        if (err?.code === 'ENOENT') return done({ error: `Not found: ${name}` })
        const all = `${stdout || ''}${stderr || ''}`
        const cut = all.length > MAX_CHARS || err?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
        const timedOut = Boolean(err?.killed) && err.code !== 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
        const code = typeof err?.code === 'number' ? err.code : err ? null : 0
        const lines = all.slice(0, MAX_CHARS).split(/\r?\n/).filter(l => l.trim())
        lines.push(timedOut ? 'stopped after 10 s' : cut ? `exit ${code ?? '?'} · output cut at 20,000 characters` : `exit ${code ?? '?'}`)
        done({ lines, code, cut, timedOut, ms: Math.round(performance.now() - t0), startMs })
      })
      child?.once?.('spawn', () => { startMs = Number((performance.now() - t0).toFixed(2)) })
    })
  }
  return { error: 'Unknown request' }
}
