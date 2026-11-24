import { test } from 'node:test'
import assert from 'node:assert/strict'
import { doubleTap } from '../app/src/core/back.ts'

test('double tap: closes Gloz on messages and home; goes home from any tool', () => {
  assert.equal(doubleTap(null), 'close')   // messages or home: the platform's rule at the root
  assert.equal(doubleTap({}), 'home')      // in a tool (tasks, reader, directions...)
})
