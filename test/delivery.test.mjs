import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changeFailureRate, reworkRate } from '../scripts/delivery.mjs'

const H = 3600e3
test('change failure rate counts finished CI runs; rework is a fix to a file changed under 7 days before', () => {
  assert.equal(changeFailureRate([{ conclusion: 'success' }, { conclusion: 'failure' }, { conclusion: 'cancelled' }, { conclusion: 'success' }]), 1 / 3)
  const commits = [
    { sha: 'aaaaaaa1', at: 0, msg: 'Add quiet hours', files: ['app.ts'] },
    { sha: 'bbbbbbb2', at: 2 * H, msg: 'Fix quiet hours at midnight', files: ['app.ts'] },
    { sha: 'ccccccc3', at: 3 * H, msg: 'README: what only Even Realities can fix', files: ['README.md'] },
    { sha: 'ddddddd4', at: 200 * H, msg: 'Fix a bug in app.ts from long ago', files: ['app.ts'] },
  ]
  const r = reworkRate(commits)
  assert.deepEqual(r.rework, ['bbbbbbb'])
  assert.equal(r.rate, 1 / 4)
})
