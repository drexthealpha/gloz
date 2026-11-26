import { test } from 'node:test'
import assert from 'node:assert/strict'
import { target, snippets, reaNames, evidence } from '../server/take-apart.mjs'
import { handle as ask } from '../server/modes/ask.mjs'

const site = {
  'https://shop.example': '<html><script src="/app.js"></script><button>Search</button></html>',
  'https://shop.example/app.js': 'const q=input.value;fetch("/api/search?q="+encodeURIComponent(q));debounce(runSearch,250);render(cart)',
}
const get = async u => ({ ok: u in site, status: u in site ? 200 : 404, text: async () => site[u] })

test('take apart: a "how does <site> ... work" question names the site and the feature', () => {
  assert.deepEqual(target("How does shop.example's search work?"), { url: 'https://shop.example', words: ['search'] })
  assert.equal(target('what is shop.example'), null)
  assert.equal(target('how are you'), null)
  assert.deepEqual(snippets([{ name: 'a.js', text: 'x=1;doSearch(q);y=2' }], ['search']), ['a.js: doSearch(q)'])
  assert.deepEqual(reaNames({ modules: [{ name: 'src/search/index.js' }, { name: 'src/cart.js' }] }, ['search']), ['src/search/index.js'])
})

test('take apart: the site\'s scripts are read and the code for the feature becomes evidence, with rea\'s names when installed', async () => {
  const e = await evidence("how does shop.example's search work", { get, rea: async () => ({ modules: ['src/search.js'] }) })
  assert.equal(e.url, 'https://shop.example')
  assert.equal(e.rea, true)
  assert.match(e.text, /^rea found: src\/search\.js/)
  assert.match(e.text, /app\.js: fetch\("\/api\/search\?q="/)
  const plain = await evidence("how does shop.example's search work", { get, rea: async () => null })
  assert.equal(plain.rea, false)
  assert.match(plain.text, /debounce\(runSearch,250\)/)
  assert.equal(await evidence('how does nothing.invalid search work', { get, rea: async () => null }), null)
})

test('Ask: a take-apart question reaches the AI with the site\'s own code', async () => {
  let sent = null
  const orig = globalThis.fetch
  globalThis.fetch = async (_u, o) => { sent = JSON.parse(o.body); return { ok: true, json: async () => ({ choices: [{ message: { content: 'It calls /api/search as you type, waiting 250 ms.' } }] }) } }
  try {
    const r = await ask({ q: "How does shop.example's search work?" }, { env: { GLOZ_OPENROUTER_KEY: 'test' }, look: q => evidence(q, { get, rea: async () => null }) })
    assert.equal(r.a, 'It calls /api/search as you type, waiting 250 ms.')
    assert.match(sent.messages.at(-1).content, /Evidence from https:\/\/shop\.example, its own code:\napp\.js: fetch/)
    assert.match(sent.messages[0].content, /naming what in the code shows it/)
  } finally { globalThis.fetch = orig }
})
