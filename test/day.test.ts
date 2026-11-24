import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayItems } from '../app/src/core/day.ts'
import { sampleDash } from '../app/src/modes/dash.ts'
import { sampleMusic } from '../app/src/modes/music.ts'
import { sampleStocks } from '../app/src/modes/stocks.ts'

test('your day: one item per source, each with its tool; samples marked; a failed source left out', () => {
  const items = dayItems({ dash: sampleDash({}), music: sampleMusic({}), stocks: sampleStocks({}), notes: { notes: [{ title: 'Sample: call with the printer' }] }, term: { on: true, allow: ['uptime'] } })
  assert.deepEqual(items.map(i => i.tool), ['dash', 'tasks', 'dash', 'music', 'stocks', 'notes', 'nav', 'term'])
  assert.equal(items[1].text, '4 tasks due')
  assert.equal(items[1].sample, true)   // said in the hint, so the line stays one line
  assert.equal(items[5].text, 'Note: call with the printer')
  assert.equal(items[5].sample, true)
  assert.ok(items.every(i => i.text.length <= 30), 'each item fits one line')
  assert.deepEqual(dayItems({ dash: null }).map(i => i.tool), ['nav'])
})
