// Teleprompter: the app's presses, the server handler and the aligner, with no keys and no network.
// Also measures word position accuracy on simulated recognition output (eval/prompter.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prompterApp, samplePrompter, scriptLines } from '../app/src/modes/prompter.ts'
import { handle, align } from '../server/modes/prompter.mjs'
import { simulate } from '../eval/prompter.mjs'

const tick = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)) }

function fakeCtx(reply) {
  const calls = [], mics = [], kept = new Map()
  const ctx = {
    call: async b => { calls.push(b); const r = await reply(b); if (r instanceof Error) throw r; return r },
    lang: () => 'en', render() {}, mic: async on => { mics.push(on) }, locate: async () => null,
    store: { get: k => kept.get(k) ?? null, set: (k, v) => kept.set(k, v) },
  }
  return { ctx, calls, mics }
}

// 1.5 s of speech-loud sound, 16 kHz 16-bit mono.
function loud(bytes = 48000) {
  const u = new Uint8Array(bytes)
  const v = new DataView(u.buffer)
  for (let i = 0; i < bytes; i += 2) v.setInt16(i, i % 4 ? 2000 : -2000, true)
  return u
}

test('aligner: finds the place after the words heard, with errors, and stays put on noise', () => {
  const script = 'the first change was simple we stopped holding meetings on wednesday that gave everyone one full day'.split(' ')
  assert.equal(align(script, ['we', 'stopped', 'holding'], 0), 8)
  assert.equal(align(script, ['stoped', 'holding', 'meetings'], 5), 9)   // a misspelling still matches
  assert.equal(align(script, ['uh', 'gave', 'everyone', 'one'], 10), 15)
  assert.equal(align(script, ['banana', 'telephone'], 3), null)
  assert.equal(align(script, [], 3), null)
})

test('handler: follow turns speech into words and returns the place in the whole script', async () => {
  const words = 'alpha beta gamma delta epsilon zeta eta theta'
  const r = await handle({ action: 'follow', pcm: Buffer.from(loud(9600)).toString('base64'), from: 100, at: 0, words, lang: 'en' }, { env: {}, stt: async (b, lang) => { assert.equal(b.length, 9600); assert.equal(lang, 'en'); return { text: 'Gamma, delta epsilon.', ms: 40 } } })
  assert.deepEqual(r, { at: 105, heard: 'Gamma, delta epsilon.', ms: 40 })
  assert.deepEqual(await handle({ action: 'follow', pcm: 'AAAA', words }, { env: {}, stt: async () => { throw new Error('none') } }), { error: 'No speech engine on the server' })
  assert.deepEqual(await handle({ action: 'list' }, { env: {} }), samplePrompter({ action: 'list' }))
})

test('script lines hold about one display line each', () => {
  const s = scriptLines('aa bb cc dd ee ff'.split(' '), 5)
  assert.deepEqual(s, [0, 2, 4])
})

test('the app: follows the voice, tap pauses, down and up move a line', async () => {
  let place = 6
  const { ctx, calls, mics } = fakeCtx(b => b.action === 'follow' ? { at: place } : samplePrompter(b))
  const m = prompterApp.make(ctx)
  await m.start(); await tick()
  assert.deepEqual(mics, [true])
  const first = m.card()
  assert.equal(first.kind, 'status')
  assert.match(first.text, /^Sample script\./)
  assert.equal(first.hint, 'Following your voice · tap: pause · down: next line · up: line back')
  m.audio(loud()); await tick()
  const f = calls.at(-1)
  assert.equal(f.action, 'follow')
  assert.equal(f.from, 0)
  assert.match(f.words, /^Sample script\. Good morning/)
  assert.equal(Buffer.from(f.pcm, 'base64').length, 48000)
  assert.ok(m.card().text.includes('thank'), 'moved to the line with word 6')
  // Silence is not sent.
  const n = calls.length
  m.audio(new Uint8Array(96000)); await tick()
  assert.equal(calls.length, n)
  m.input('tap')
  assert.deepEqual(mics, [true, false])
  assert.match(m.card().hint, /^Paused · tap: follow voice/)
  const line = m.card().progress[0]
  m.input('next'); assert.equal(m.card().progress[0], line + 1)
  m.input('prev'); m.input('prev'); assert.equal(m.card().progress[0], line - 1)
  m.input('tap')
  assert.deepEqual(mics, [true, false, true])
  m.stop()
  assert.deepEqual(mics, [true, false, true, false])
})

test('the app: no speech engine stops following with a clear line', async () => {
  const { ctx } = fakeCtx(b => b.action === 'follow' ? { error: 'No speech engine on the server' } : samplePrompter(b))
  const m = prompterApp.make(ctx)
  await m.start(); await tick()
  m.audio(loud()); await tick()
  assert.match(m.card().hint, /^No speech engine on the server · tap: follow voice/)
})

test('measure: word position accuracy on simulated recognition output', () => {
  const s = simulate()
  assert.ok(s.chunks > 500)
  assert.ok(s.exact > 0 && s.exact <= 1)
  console.log(`# prompter measure: exact word position ${(s.exact * 100).toFixed(1)}%, within one word ${(s.within1 * 100).toFixed(1)}%, ${s.chunks} updates`)
})
