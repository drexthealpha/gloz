import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle as weather, sky } from '../server/modes/weather.mjs'
import { handle as news, headlines } from '../server/modes/news.mjs'
import { seconds, clock } from '../app/src/modes/timer.ts'
import { said } from '../app/src/core/say.ts'

const reply = (body, ok = true) => async () => ({ ok, status: ok ? 200 : 503, json: async () => body, text: async () => body })

test('weather: the phone position goes to Open-Meteo; now, today and tomorrow come back as lines', async () => {
  let asked = ''
  const j = { current: { temperature_2m: 13.6, weather_code: 2, wind_speed_10m: 11.8 }, daily: { temperature_2m_min: [8.6, 7.9], temperature_2m_max: [15.5, 12.6], precipitation_probability_max: [40, 80], weather_code: [2, 63] } }
  const r = await weather({ lat: 6.5244, lon: 3.3792 }, { env: {}, fetch: async (u) => { asked = u; return reply(j)() } })
  assert.match(asked, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=6\.524&longitude=3\.379&/)
  assert.deepEqual(r.lines, ['Now 14° · Partly cloudy · wind 12 km/h', 'Today 9° to 16° · rain 40%', 'Tomorrow 8° to 13° · Rain · rain 80%'])
  assert.equal(sky(95), 'Thunderstorm')
  assert.deepEqual(await weather({}, { env: {}, fetch: reply(j) }), { error: 'Location off on the phone' })
  assert.equal((await weather({}, { env: { GLOZ_WEATHER_AT: '51.5,-0.12' }, fetch: reply(j) })).lines.length, 3)
  assert.deepEqual(await weather({ lat: 1, lon: 1 }, { env: {}, fetch: async () => { throw new Error('down') } }), { error: 'No forecast: no connection' })
})

test('news: headlines from an RSS feed, in order, decoded, without repeats', async () => {
  const xml = '<rss><channel><title>Feed name</title><item><title><![CDATA[Rates held at 4%]]></title></item><item><title>Storm &amp; floods</title></item><item><title>Storm &amp; floods</title></item></channel></rss>'
  assert.deepEqual(headlines(xml), ['Rates held at 4%', 'Storm & floods'])
  const r = await news({}, { env: { GLOZ_NEWS_FEED: 'https://feeds.example.org/world.xml' }, fetch: reply(xml) })
  assert.deepEqual(r.lines, ['Rates held at 4%', 'Storm & floods'])
  assert.equal(r.source, 'example.org')
  assert.deepEqual(await news({}, { env: {}, fetch: reply('', false) }), { error: 'No news: 503' })
})

test('timer: how long, said in digits or words, and the clock shown', () => {
  assert.deepEqual(['5 minutes', 'five minutes', '90 seconds', '1 hour 30 minutes', 'half an hour', '10', 'soon'].map(seconds), [300, 300, 90, 5400, 1800, 600, null])
  assert.equal(clock(299), '4:59')
  assert.equal(clock(3723), '1:02:03')
})

test('saying what you want opens that tool: timer, weather, news', () => {
  assert.deepEqual(said('set a timer for 10 minutes'), { tool: 'timer', arg: '10 minutes' })
  assert.deepEqual(said('5 minute timer'), { tool: 'timer', arg: '5 minute' })
  assert.deepEqual(said("What's the weather?"), { tool: 'weather' })
  assert.deepEqual(said('will it rain tomorrow'), { tool: 'weather' })
  assert.deepEqual(said("today's news"), { tool: 'news' })
  assert.equal(said('what time is it?').tool, 'ask')
})
