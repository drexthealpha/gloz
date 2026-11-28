import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tapTooSoon, within, GUARD_MS, HEARING_MS } from '../app/src/core/guard.ts'

test('a tap in the first 600 ms of a new reply card does not send it; after that it does; other screens are not held', () => {
  assert.equal(GUARD_MS, 600)
  assert.equal(tapTooSoon('draft', 1000, 1400), true)
  assert.equal(tapTooSoon('draft', 1000, 1600), false)
  assert.equal(tapTooSoon('message', 1000, 1100), false)
})

test('words being written down give up after 8 s with nothing heard, and a quick answer is never held back', async () => {
  assert.equal(HEARING_MS, 8000)
  assert.deepEqual(await within(new Promise(() => {}), 20, { text: '' }), { text: '' })
  assert.deepEqual(await within(Promise.resolve({ text: 'send' }), 1000, { text: '' }), { text: 'send' })
})
