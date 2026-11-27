import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// A number in eval/rows.mjs worked out from code, not measured: worked out again here from the same code.
test('row 28: how far "Low" moves the line is what glasses.ts y() gives', () => {
  const strip = Number(read('app/src/render.ts').match(/export const STRIP = (\d+)/)[1])
  const [, low, mid] = read('app/src/glasses.ts').match(/y\(\)\s*\{\s*return this\.low \? ([^:]+?) : ([^}\n]+?)\s*\}/)
  const calc = (e) => { assert.match(e, /^[\d\s+\-*/()STRIP]+$/); return Function(`return ${e.replace(/STRIP/g, String(strip))}`)() }
  const said = Number(read('eval/rows.mjs').match(/or (\d+) px lower/)[1])
  assert.equal(said, calc(low) - calc(mid))
})
