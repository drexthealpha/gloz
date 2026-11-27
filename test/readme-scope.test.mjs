import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8')

test('the README keeps to the message job; the rest is one link away and that link resolves', () => {
  assert.doesNotMatch(md, /### Complaints only Even Realities can fix/)
  const how = md.split('## How it works on the glasses')[1].split('\n## ')[0]
  const rows = how.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| You'))
  assert.ok(rows.length >= 8)
  for (const r of rows) assert.doesNotMatch(r, /stock|directions|prompter|timer|weather|\bnews\b|server command/i, r)
  for (const [, link] of md.matchAll(/\]\((docs\/[^)#]+)\)/g)) assert.ok(existsSync(new URL(`../${link}`, import.meta.url)), link)
  const beyond = readFileSync(new URL('../docs/BEYOND-MESSAGES.md', import.meta.url), 'utf8')
  assert.equal(beyond.split('\n').filter(l => /^\| \d+ \|/.test(l)).length, 69)
})
