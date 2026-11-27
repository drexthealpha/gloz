// Weather: now, today and tomorrow for where the phone is, from Open-Meteo (open-meteo.com, free,
// no key). Without the phone's position, GLOZ_WEATHER_AT ("lat,lon") is used.
// body: { lat, lon } -> { lines: [string], t }   t: the forecast's time, unix ms
const WORDS = [[0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [48, 'Fog'], [57, 'Drizzle'], [67, 'Rain'], [77, 'Snow'], [82, 'Showers'], [86, 'Snow showers'], [99, 'Thunderstorm']]
export const sky = code => (WORDS.find(([n]) => code <= n) || WORDS.at(-1))[1]

export const SAMPLE = { lines: ['Now 14° · Partly cloudy · wind 12 km/h', 'Today 9° to 16° · rain 40%', 'Tomorrow 8° to 13° · Rain · rain 80%'], t: Date.UTC(2026, 10, 20, 9, 0), sample: true }

export function lines(j) {
  const c = j.current, d = j.daily, r = n => Math.round(n)
  return [
    `Now ${r(c.temperature_2m)}° · ${sky(c.weather_code)} · wind ${r(c.wind_speed_10m)} km/h`,
    `Today ${r(d.temperature_2m_min[0])}° to ${r(d.temperature_2m_max[0])}° · rain ${d.precipitation_probability_max[0] ?? 0}%`,
    `Tomorrow ${r(d.temperature_2m_min[1])}° to ${r(d.temperature_2m_max[1])}° · ${sky(d.weather_code[1])} · rain ${d.precipitation_probability_max[1] ?? 0}%`,
  ]
}

export async function handle(body, { env, fetch: get = globalThis.fetch }) {
  if (env.GLOZ_SAMPLE === '1') return SAMPLE
  let lat = Number(body?.lat), lon = Number(body?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || body?.lat == null) [lat, lon] = String(env.GLOZ_WEATHER_AT || '').split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: 'Location off on the phone' }
  const q = `latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=2`
  try {
    // A controller and a timer, not AbortSignal.timeout: this also runs in the glasses WebView, and older ones lack it.
    const c = new AbortController(), timer = setTimeout(() => c.abort(), 8000)
    const r = await get(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: c.signal }).finally(() => clearTimeout(timer))
    if (!r.ok) return { error: `No forecast: ${r.status}` }
    const j = await r.json()
    return { lines: lines(j), t: Date.now() }
  } catch { return { error: 'No forecast: no connection' } }
}
