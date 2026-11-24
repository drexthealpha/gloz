import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { termApp, sampleTerm } from '../app/src/modes/term.ts'
import { handle, SAMPLE_LIST, SAMPLE_RUN, spoken } from '../server/modes/term.mjs'
import { EventEmitter } from 'node:events'

function fakeCtx(reply) {
  const calls = [], kv = {}
  const ctx = {
    call: async b => { calls.push(b); return typeof reply === 'function' ? reply(b) : reply },
    lang: () => 'en', render: () => {}, mic: async () => {}, locate: async () => null,
    store: { get: k => kv[k] ?? null, set: (k, v) => { kv[k] = v } },
  }
  return { ctx, calls, kv }
}
const tick = () => new Promise(r => setTimeout(r, 0))

// A stand-in for execFile: records the call and answers with the given result.
function fakeRun(result) {
  const seen = []
  const run = (file, args, opts, cb) => {
    seen.push({ file, args, opts })
    const child = new EventEmitter()
    setImmediate(() => { child.emit('spawn'); cb(result.err ?? null, result.stdout ?? '', result.stderr ?? '') })
    return child
  }
  return { run, seen }
}
const ON = { GLOZ_TERMINAL: '1', GLOZ_TERMINAL_ALLOW: 'uptime, git' }

test('the samples on the glasses match the server samples', () => {
  assert.deepEqual(sampleTerm({ op: 'list' }), SAMPLE_LIST)
  const run = sampleTerm({ op: 'run' })
  assert.deepEqual({ ...run, lines: [] }, { ...SAMPLE_RUN, lines: [] })
  assert.match(run.lines[0], / up 3 days/)
  assert.equal(run.lines[1], 'done')
})

test('handler: off unless GLOZ_TERMINAL=1, and nothing runs then', async () => {
  const { run, seen } = fakeRun({ stdout: 'x' })
  assert.deepEqual(await handle({ op: 'run', cmd: 'uptime' }, { env: { GLOZ_TERMINAL_ALLOW: 'uptime' }, run }), { on: false })
  assert.deepEqual(await handle({ op: 'list' }, { env: ON }), { on: true, allow: ['uptime', 'git'] })
  assert.equal(seen.length, 0)
})

test('handler: only allowed names run, through execFile with no shell and the limits', async () => {
  const { run, seen } = fakeRun({ stdout: 'On branch main\n\nnothing to commit\n' })
  assert.match((await handle({ op: 'run', cmd: 'rm -rf x' }, { env: ON, run })).error, /Not allowed: rm/)
  assert.match((await handle({ op: 'run', cmd: 'git;rm' }, { env: ON, run })).error, /Not allowed/)
  assert.equal(seen.length, 0)
  const r = await handle({ op: 'run', cmd: '  git   status ' }, { env: ON, run })
  assert.deepEqual(seen[0].file, 'git')
  assert.deepEqual(seen[0].args, ['status'])
  assert.equal(seen[0].opts.shell, false)
  assert.equal(seen[0].opts.timeout, 10000)
  assert.deepEqual(r.lines, ['On branch main', 'nothing to commit', 'done'])
  assert.equal(r.code, 0)
  assert.ok(r.startMs >= 0)
})

test('handler: output is cut at 20,000 characters; a timeout and a missing program say so', async () => {
  const long = await handle({ op: 'run', cmd: 'uptime' }, { env: ON, run: fakeRun({ stdout: 'a'.repeat(30000) }).run })
  assert.equal(long.cut, true)
  assert.equal(long.lines[0].length, 20000)
  const slow = await handle({ op: 'run', cmd: 'uptime' }, { env: ON, run: fakeRun({ err: Object.assign(new Error('t'), { killed: true, signal: 'SIGTERM', code: null }), stdout: 'part' }).run })
  assert.equal(slow.timedOut, true)
  assert.deepEqual(slow.lines, ['part', 'stopped after 10 s'])
  const gone = await handle({ op: 'run', cmd: 'uptime' }, { env: ON, run: fakeRun({ err: Object.assign(new Error('x'), { code: 'ENOENT' }) }).run })
  assert.equal(gone.error, 'Not found: uptime')
  const failed = await handle({ op: 'run', cmd: 'git' }, { env: ON, run: fakeRun({ err: Object.assign(new Error('x'), { code: 1 }), stderr: 'fatal: no repo' }).run })
  assert.deepEqual(failed.lines, ['fatal: no repo', 'failed (exit 1)'])
})

test('handler: a spoken command is written down, checked, and not run', async () => {
  const { run, seen } = fakeRun({ stdout: 'x' })
  const stt = mock.fn(async () => ({ text: 'Git status.' }))
  assert.deepEqual(await handle({ op: 'say', pcm: 'AAAA' }, { env: ON, stt, run }), { cmd: 'git status' })
  assert.match((await handle({ op: 'say', pcm: 'AAAA' }, { env: ON, stt: async () => ({ text: 'Shutdown now' }), run })).error, /Not allowed: shutdown/)
  assert.equal(seen.length, 0)
  assert.equal(spoken('Uptime!'), 'uptime')
})

test('handler: one real harmless command (node --version) runs and reports its start time', async () => {
  const r = await handle({ op: 'run', cmd: 'node --version' }, { env: { GLOZ_TERMINAL: '1', GLOZ_TERMINAL_ALLOW: 'node' } })
  assert.match(r.lines[0], /^v\d+\./)
  assert.ok(r.startMs > 0 && r.startMs < r.ms + 1)
})

test('mode: list, move, nothing runs before the tap, then output line by line', async () => {
  const { ctx, calls, kv } = fakeCtx(b => b.op === 'list' ? { on: true, allow: ['uptime', 'git status'] } : { lines: ['up 3 days', 'exit 0'], code: 0 })
  const m = termApp.make(ctx)
  await m.start()
  assert.equal(m.card().text, 'uptime')
  assert.equal(m.card().hint, 'tap: run · down: next · up: earlier · hold: speak')
  m.input('next')
  assert.equal(m.card().text, 'git status')
  assert.equal(calls.filter(c => c.op === 'run').length, 0)
  m.input('tap'); await tick()
  assert.deepEqual(calls.at(-1), { op: 'run', cmd: 'git status' })
  assert.equal(m.card().text, 'git status: up 3 days')
  assert.equal(m.card().hint, 'tap: commands · down: next line')
  assert.deepEqual(m.card().progress, [1, 2])
  m.input('next')
  assert.equal(m.card().text, 'git status: exit 0')
  assert.equal(m.card().hint, 'tap: commands · up: earlier')   // the last line offers no down
  m.input('tap')
  assert.equal(m.card().text, 'git status')
  assert.deepEqual(JSON.parse(kv['term.saved']), ['git status'])
})

test('mode: a spoken command waits for a tap; off and no signal are clear', async () => {
  const { ctx, calls } = fakeCtx(b => b.op === 'list' ? { on: true, allow: ['uptime'] } : b.op === 'say' ? { cmd: 'df -h' } : { lines: ['ok'] })
  const m = termApp.make(ctx)
  await m.start()
  m.input('hold'); m.audio(new Uint8Array([9, 9])); m.input('release'); await tick()
  assert.equal(calls[1].op, 'say')
  assert.equal(m.card().text, 'df -h')
  assert.equal(calls.length, 2)
  const off = termApp.make(fakeCtx({ on: false }).ctx)
  await off.start()
  assert.equal(off.card().text, 'Terminal is off')
  const down = termApp.make(fakeCtx(() => { throw new Error('x') }).ctx)
  await down.start()
  assert.equal(down.card().text, 'No signal')
  const bad = fakeCtx(b => b.op === 'list' ? { on: true, allow: ['uptime'] } : { error: 'Not allowed: rm' })
  const n = termApp.make(bad.ctx)
  await n.start()
  n.input('tap'); await tick()
  assert.equal(n.card().text, 'Not allowed: rm')
  n.input('tap')
  assert.equal(n.card().text, 'uptime')
})
