import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quietUntil, quietLabel, quietNote } from '../app/src/core/quiet.ts'

const at = (h: number) => new Date(2026, 10, 27, h, 30)

test('quiet hours across midnight hold messages from the start hour until the end hour, and only then', () => {
  assert.equal(quietUntil('22-7', at(23)), 7)
  assert.equal(quietUntil('22-7', at(3)), 7)
  assert.equal(quietUntil('22-7', at(7)), null)
  assert.equal(quietUntil('22-7', at(12)), null)
  assert.equal(quietUntil('0-7', at(0)), 7)
  assert.equal(quietUntil('', at(23)), null)
  assert.equal(quietUntil(undefined, at(23)), null)
  assert.equal(quietLabel('22-7'), '22:00 to 07:00')
})

test('the glasses say when quiet ends, with the hour, in each of the ten glasses languages', () => {
  for (const l of ['en', 'ar', 'fa', 'he', 'hi', 'th', 'ja', 'ko', 'zh', 'ru']) assert.match(quietNote(l, 7), /07:00/, l)
  assert.equal(quietNote('en', 7), 'Quiet until 07:00 · messages wait')
  assert.equal(quietNote('xx', 23), 'Quiet until 23:00 · messages wait')
})
