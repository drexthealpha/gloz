import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
import { ignored, mark } from '../scripts/ignore.mjs'

const DASH = String.fromCharCode(0x2014)

test('a checker finding is silenced only by its own marker on that line', () => {
  assert.equal(mark('text'), 'check-text: ' + 'ignore-line')
  assert.ok(ignored(`x ${DASH} y <!-- ${mark('text')} -->`, 'text'))
  assert.ok(!ignored(`x ${DASH} y <!-- ${mark('secrets')} -->`, 'text'))
  assert.ok(!ignored(`x ${DASH} y`, 'text'))
})

test('check-text lets a marked line through, counts it, and still fails an unmarked one', () => {
  const f = new URL('../docs-ignore-fixture.md', import.meta.url)
  const run = () => { try { return { code: 0, out: execFileSync(process.execPath, ['scripts/check-text.mjs'], { encoding: 'utf8' }) } } catch (e) { return { code: e.status, out: e.stdout } } }
  try {
    writeFileSync(f, `a ${DASH} b <!-- ${mark('text')} -->\n`)
    const ok = run()
    assert.equal(ok.code, 0, ok.out)
    assert.match(ok.out, /1 line\(s\) marked ignore-line/)
    writeFileSync(f, `a ${DASH} b\n`)
    const bad = run()
    assert.equal(bad.code, 1)
    assert.match(bad.out, /docs-ignore-fixture\.md:1: em dash/)
  } finally { rmSync(f, { force: true }) }
})
