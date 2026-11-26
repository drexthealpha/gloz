// The small class merger gives the same classes as tailwind-merge on every combination the app uses:
// each shadcn component's own classes, followed by each class string written in the app's screens.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { twMerge } from '../app/node_modules/tailwind-merge/dist/bundle-mjs.mjs'
import { merge } from '../app/src/phone/lib/merge.ts'

const ui = new URL('../app/src/phone/components/ui/', import.meta.url)
const screens = ['phone/MoreSettings.tsx', 'phone/SettingsScreen.tsx', 'phone/PairScreen.tsx', 'phone/shared.tsx', 'demo-controls.tsx'].map(f => new URL(`../app/src/${f}`, import.meta.url))
const strings = (t: string) => [...t.matchAll(/(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g)].map(m => m[2].replace(/\$\{[^}]*\}/g, ' ').trim()).filter(s => /^[\w\[\]\-:/.%&>=*()!#,]+( [\w\[\]\-:/.%&>=*()!#,]+)*$/.test(s) && s.includes('-'))
const bases = readdirSync(ui).flatMap(f => strings(readFileSync(new URL(f, ui), 'utf8')))
const overrides = [...new Set(screens.flatMap(u => strings(readFileSync(u, 'utf8'))))]

test('the class merger matches tailwind-merge on every component class and app override in use', () => {
  assert.ok(bases.length > 20 && overrides.length > 20, `${bases.length} component strings, ${overrides.length} overrides`)
  let n = 0
  for (const b of bases) for (const o of overrides) {
    const s = `${b} ${o}`
    // The same class twice changes nothing on the page, so results compare as sets.
    assert.deepEqual([...new Set(merge(s).split(' '))].sort(), [...new Set(twMerge(s).split(' '))].sort(), s)
    n++
  }
  assert.ok(n > 400)
})
