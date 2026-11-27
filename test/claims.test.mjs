import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { check } from '../scripts/claims.mjs'

const { claims } = JSON.parse(readFileSync(new URL('../eval/claims.json', import.meta.url), 'utf8'))
const real = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')

test('every hand-written number in eval/claims.json matches its source, and a drifted copy fails', () => {
  assert.deepEqual(check(claims, real), [])
  // The code changes, the docs do not: the check names both files and both values.
  const drift = f => f === 'server/ai.mjs' ? real(f).replace('thread.slice(-8)', 'thread.slice(-12)') : real(f)
  const bad = check(claims, drift)
  assert.equal(bad.length, 2)
  assert.match(bad[0], /says 8 but server\/ai\.mjs has 12/)
  // A number written as a word counts: "five wrong codes" is 5.
  assert.deepEqual(check([{ what: 'w', in: { file: 'a', regex: '(\\w+) wrong' }, from: { file: 'b', regex: '>= (\\d+)' } }], f => f === 'a' ? 'five wrong' : 'x >= 5'), [])
})
