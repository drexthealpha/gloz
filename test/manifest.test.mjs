import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const A = p => new URL(`../app/${p}`, import.meta.url)

test('the phone page and the app can be added to a home screen: a manifest, linked from both, with an icon that exists', () => {
  for (const page of ['index.html', 'phone-check.html']) assert.match(readFileSync(A(page), 'utf8'), /<link rel="manifest" href="manifest\.webmanifest">/, page)
  const m = JSON.parse(readFileSync(A('public/manifest.webmanifest'), 'utf8'))
  assert.equal(m.name, 'Gloz')
  assert.equal(m.display, 'standalone')
  for (const i of m.icons) assert.ok(existsSync(A(`public/${i.src}`)), i.src)
})
