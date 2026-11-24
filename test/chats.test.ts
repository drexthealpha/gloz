import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shows } from '../app/src/core/chats.ts'

test('chats on the glasses: every chat when none is picked; only the picked ones once any is; never a muted one', () => {
  const none = new Set<string>(), muted = new Set(['telegram:Spam'])
  assert.equal(shows('slack:#launch', none, none), true)
  assert.equal(shows('telegram:Spam', muted, none), false)
  const only = new Set(['telegram:Board'])
  assert.equal(shows('telegram:Board', none, only), true)
  assert.equal(shows('slack:#launch', none, only), false)
  assert.equal(shows('telegram:Board', new Set(['telegram:Board']), only), false)
})
