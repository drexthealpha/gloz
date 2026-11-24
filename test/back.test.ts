import { test } from 'node:test'
import assert from 'node:assert/strict'
import { doubleTap } from '../app/src/core/back.ts'

test('double tap: closes Gloz on messages, goes to the Apps list from an app, to messages from the list', () => {
  const list = {}, app = {}
  assert.equal(doubleTap(null, null), 'close')     // no app opened yet
  assert.equal(doubleTap(null, list), 'close')     // the list was opened before, now closed
  assert.equal(doubleTap(app, list), 'list')
  assert.equal(doubleTap(list, list), 'messages')
})
