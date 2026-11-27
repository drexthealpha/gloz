import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'

// The English source: key, text and longest allowed length, as strings.ts writes them.
const src = readFileSync(new URL('../app/src/phone/strings.ts', import.meta.url), 'utf8')
const en = Object.fromEntries([...src.matchAll(/^  (\w+): s\((['"])((?:(?!\2)[^\\]|\\.)*)\2\),.*\(max (\d+)\)/gm)].map(m => [m[1], { text: m[3], max: Number(m[4]) }]))
const dir = new URL('../app/public/lang/', import.meta.url)
const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')) : []

test('every phone-page language has every string, keeps {n}, fits each length, and says who translated it', () => {
  assert.ok(Object.keys(en).length > 70)
  assert.deepEqual(files.map(f => f.slice(0, -5)).sort(), ['ar', 'fa', 'he', 'hi', 'ja', 'ko', 'ru', 'th', 'zh'])
  for (const f of files) {
    const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
    assert.match(j._meta?.reviewed_by ?? '', /not yet reviewed/, f)
    assert.deepEqual(Object.keys(j).filter(k => k !== '_meta').sort(), Object.keys(en).sort(), f)
    for (const [k, { text, max }] of Object.entries(en)) {
      const v = j[k]
      assert.equal(typeof v, 'string', `${f} ${k}`)
      assert.ok(v.trim().length > 0, `${f} ${k} is empty`)
      assert.equal(v.includes('{n}'), text.includes('{n}'), `${f} ${k}: {n}`)
      assert.ok([...v].length <= max, `${f} ${k}: ${[...v].length} > ${max}`)
      assert.ok(!v.includes(String.fromCharCode(0x2014)), `${f} ${k}: em dash`)
    }
  }
})

test("a new wearer starts in the phone's own language when the glasses speak it, else English", async () => {
  const { phoneLang } = await import('../app/src/core/words.ts')
  assert.equal(phoneLang(['ja-JP', 'en-US']), 'ja')
  assert.equal(phoneLang(['de-DE', 'ar-EG']), 'ar')
  assert.equal(phoneLang(['pt-BR']), 'en')
  assert.equal(phoneLang([]), 'en')
})
