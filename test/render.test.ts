// Which display a card uses, and how many rows a part holds. The text is measured by a stand-in canvas
// (each character 0.45 of the font size wide, about Segoe UI's average for Latin text), enough to test the layout decision without a browser.
import { test } from 'node:test'
import assert from 'node:assert/strict'

;(globalThis as any).document = {
  createElement: () => ({ getContext: () => ({ font: '48px x', measureText(s: string) { return { width: [...s].length * parseFloat(this.font) * 0.45 } } }) }),
}
const { layoutFor, hintPx } = await import('../app/src/render.ts')
const { SIZES } = await import('../app/src/core/types.ts')

test('a status too long for one line, even at the smallest size, uses the whole display at the wearer size', () => {
  const long = { kind: 'status' as const, text: 'Listening… say your reply, or say send or skip, then let go', hint: 'let go or tap: done' }
  const r = layoutFor(long, 3)
  assert.equal(r.full, true)
  assert.equal(r.lay.lines.length, 1, 'one screen')
  assert.equal(r.lay.px, 48, 'the usual size, not shrunk')
  // A short status stays on the one-line strip.
  assert.equal(layoutFor({ kind: 'status', text: 'Sent ✓' }, 3).full, false)
})

test('a longer reply shows whole on one screen before the tap that sends it', () => {
  const r = layoutFor({ kind: 'draft', text: "I'll check my schedule and confirm three o'clock tomorrow shortly.", head: '↩ AI draft 1/3' }, 3)
  assert.equal(r.full, true)
  assert.equal(r.lay.lines.length, 1)
})

test('the hint that says what a press does grows with the text: larger at sizes 6 and 7, never smaller than at size 1', () => {
  const at = SIZES.map((px: number) => hintPx(px))
  assert.deepEqual(at, [20, 20, 20, 20, 20, 26, 30])
  for (let k = 1; k < at.length; k++) assert.ok(at[k] >= at[k - 1])
})
