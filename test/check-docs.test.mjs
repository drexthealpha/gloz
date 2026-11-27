import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { missing } from '../scripts/check-docs.mjs'

test('a doc link, path or npm script that does not exist is named; ones that exist pass', () => {
  const d = mkdtempSync(join(tmpdir(), 'gloz-docs-'))
  mkdirSync(join(d, 'scripts'))
  writeFileSync(join(d, 'scripts/a.mjs'), '')
  writeFileSync(join(d, 'package.json'), JSON.stringify({ scripts: { test: 'x' } }))
  writeFileSync(join(d, 'README.md'), '[ok](scripts/a.mjs) [gone](scripts/b.mjs) `scripts/c.mjs` [web](https://x.y) `npm run test` `npm run nope`\n')
  assert.deepEqual(missing(d), ['README.md: link scripts/b.mjs', 'README.md: path scripts/c.mjs', 'README.md: npm run nope'])
})
