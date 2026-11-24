// Now playing: presses on the glasses and the Spotify handler, with fetch mocked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { musicApp, sampleMusic } from '../app/src/modes/music.ts'
import { handle, SAMPLE, NEED, resetToken } from '../server/modes/music.mjs'

function fakeCtx(reply) {
  const ctx = {
    calls: [],
    call: async b => { ctx.calls.push(b); if (reply instanceof Error) throw reply; return typeof reply === 'function' ? reply(b) : reply },
    lang: () => 'en', render: () => {}, mic: async () => {}, locate: async () => null,
    store: { get: () => null, set: () => {} },
  }
  return ctx
}
const tick = () => new Promise(r => setTimeout(r, 0))

test('music: shows the track, tap pauses and plays, down skips, up refreshes', async () => {
  let playing = true
  const ctx = fakeCtx(b => { if (b.action === 'pause') playing = false; if (b.action === 'play') playing = true; return { track: b.action === 'next' ? 'Gymnopedie No. 1' : 'Clair de lune', artist: 'Debussy', playing } })
  const m = musicApp.make(ctx)
  assert.equal(m.card().text, 'Loading')
  await m.start(); await tick()
  assert.equal(m.card().text, 'Playing: Clair de lune · Debussy')
  assert.match(m.card().hint, /^tap: pause · down: next track · up: refresh/)
  m.input('tap'); await tick()
  assert.equal(ctx.calls.at(-1).action, 'pause')
  assert.match(m.card().text, /^Paused/)
  m.input('tap'); await tick()
  assert.equal(ctx.calls.at(-1).action, 'play')
  m.input('next'); await tick()
  assert.match(m.card().text, /Gymnopedie/)
  m.input('prev'); await tick()
  assert.equal(ctx.calls.at(-1).action, 'now')
  m.stop()
})

test('music: no keys, no signal and nothing playing each give one clear line', async () => {
  let m = musicApp.make(fakeCtx({ need: NEED }))
  m.start(); await tick(); m.stop()
  assert.equal(m.card().text, NEED)
  m = musicApp.make(fakeCtx(new Error('down')))
  m.start(); await tick(); m.stop()
  assert.equal(m.card().text, 'No signal')
  m = musicApp.make(fakeCtx({}))
  m.start(); await tick(); m.stop()
  assert.equal(m.card().text, 'Nothing playing')
})

test('music server: no keys says what to connect; sample mode gives the fixed track', async () => {
  assert.deepEqual(await handle({ action: 'now' }, { env: {} }), { need: NEED })
  assert.deepEqual(await handle({ action: 'now' }, { env: { GLOZ_SAMPLE: '1' } }), SAMPLE)
  assert.deepEqual(sampleMusic({}), SAMPLE)
})

const ENV = { GLOZ_SPOTIFY_CLIENT_ID: 'id', GLOZ_SPOTIFY_CLIENT_SECRET: 'secret', GLOZ_SPOTIFY_REFRESH_TOKEN: 'refresh' }
async function withFetch(fn, routes) {
  const real = globalThis.fetch
  const seen = []
  globalThis.fetch = async (url, init = {}) => {
    seen.push(`${init.method || 'GET'} ${url}`)
    if (url.includes('accounts.spotify.com')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }))
    const r = routes(url, init)
    return r
  }
  resetToken()
  try { return await fn(seen) } finally { globalThis.fetch = real }
}

test('music server: refreshes the token once, reads the track, uses PUT for pause and POST for next', async () => {
  await withFetch(async seen => {
    const now = await handle({ action: 'now' }, { env: ENV })
    assert.deepEqual(now, { track: 'Clair de lune', artist: 'Claude Debussy', playing: true })
    const paused = await handle({ action: 'pause' }, { env: ENV })
    assert.equal(paused.playing, false)
    await handle({ action: 'next' }, { env: ENV })
    assert.equal(seen.filter(s => s.includes('accounts.spotify.com')).length, 1)
    assert.ok(seen.includes('PUT https://api.spotify.com/v1/me/player/pause'))
    assert.ok(seen.includes('POST https://api.spotify.com/v1/me/player/next'))
  }, url => url.endsWith('/currently-playing')
    ? new Response(JSON.stringify({ is_playing: true, item: { name: 'Clair de lune', artists: [{ name: 'Claude Debussy' }] } }))
    : new Response(null, { status: 204 }))
})

test('music server: nothing playing, no device, no Premium, network down', async () => {
  await withFetch(async () => {
    assert.deepEqual(await handle({ action: 'now' }, { env: ENV }), {})
    assert.match((await handle({ action: 'play' }, { env: ENV })).error, /No active player/)
    assert.match((await handle({ action: 'next' }, { env: ENV })).error, /Premium/)
  }, (url, init) => url.endsWith('/currently-playing') ? new Response(null, { status: 204 }) : new Response(null, { status: init.method === 'PUT' ? 404 : 403 }))
  await withFetch(async () => {
    assert.deepEqual(await handle({ action: 'now' }, { env: ENV }), { error: 'No signal to Spotify' })
  }, () => { throw new Error('offline') })
})
