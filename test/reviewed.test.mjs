import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stale, DOCS } from '../scripts/reviewed.mjs'

test('each living doc names its owner and review date; one unread for over 90 days is flagged', () => {
  const now = Date.parse('2027-03-01')
  assert.equal(stale('text', now), 'no owner and reviewed-date line')
  assert.equal(stale('Owner: a · reviewed 2027-01-15', now), '')
  assert.match(stale('Owner: a · reviewed 2026-11-27', now), /94 days ago/)
  for (const d of DOCS) assert.notEqual(stale(readFileSync(new URL(`../${d}`, import.meta.url), 'utf8'), Date.parse('2026-11-28')), 'no owner and reviewed-date line', d)
})
