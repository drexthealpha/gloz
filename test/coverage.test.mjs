import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The README's coverage comes from eval/results/coverage.json; CI checks its own run against it.
test('coverage check: a run within 1 point of the committed numbers passes, one further off fails', () => {
  const was = JSON.parse(readFileSync(new URL('../eval/results/coverage.json', import.meta.url), 'utf8'))
  const dir = mkdtempSync(join(tmpdir(), 'gloz-cov-'))
  const run = (line) => {
    const f = join(dir, 'c.log')
    writeFileSync(f, `ℹ file | line % | branch % | funcs % | uncovered lines\nℹ all files | ${line} | ${was.branch} | ${was.funcs} |\n`)
    try { return { code: 0, out: execFileSync(process.execPath, ['scripts/coverage.mjs', '--check', f], { encoding: 'utf8' }) } } catch (e) { return { code: e.status, out: e.stdout } }
  }
  assert.equal(run(was.line + 0.5).code, 0)
  const off = run(was.line - 2)
  assert.equal(off.code, 1)
  assert.match(off.out, /OFF\s+line coverage/)
})
