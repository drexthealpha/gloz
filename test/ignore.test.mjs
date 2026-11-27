import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ignored, mark } from '../scripts/ignore.mjs'

const DASH = String.fromCharCode(0x2014)

test('a checker finding is silenced only by its own marker on that line', () => {
  assert.equal(mark('text'), 'check-text: ' + 'ignore-line')
  assert.ok(ignored(`x ${DASH} y <!-- ${mark('text')} -->`, 'text'))
  assert.ok(!ignored(`x ${DASH} y <!-- ${mark('secrets')} -->`, 'text'))
  assert.ok(!ignored(`x ${DASH} y`, 'text'))
})

test('check-text lets a marked line through, counts it, and still fails an unmarked one', () => {
  // A folder of its own, so nothing else in the repository (or another test's file) can change the result.
  const dir = mkdtempSync(join(tmpdir(), 'gloz-text-'))
  const f = join(dir, 'docs-ignore-fixture.md')
  const run = () => { try { return { code: 0, out: execFileSync(process.execPath, ['scripts/check-text.mjs', dir], { encoding: 'utf8' }) } } catch (e) { return { code: e.status, out: e.stdout } } }
  try {
    writeFileSync(f, `a ${DASH} b <!-- ${mark('text')} -->\n`)
    const ok = run()
    assert.equal(ok.code, 0, ok.out)
    assert.match(ok.out, /1 line\(s\) marked ignore-line/)
    writeFileSync(f, `a ${DASH} b\n`)
    const bad = run()
    assert.equal(bad.code, 1)
    assert.match(bad.out, /docs-ignore-fixture\.md:1: em dash/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
