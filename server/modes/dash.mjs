// Dashboard data for the panels the wearer chose. Weather comes from Open-Meteo (free, no key).
// Mail, calendar and tasks use the Google refresh token in GLOZ_GOOGLE_*; a field is null when
// that service is not set up or not allowed, so the glasses say so instead of showing a number.
export const SAMPLE = {
  sample: true,
  unread: 10,
  events: [{ at: '2026-11-24T09:30:00Z', title: 'Standup' }, { at: '2026-11-24T14:00:00Z', title: 'Board review' }],
  tasks: { due: 4, first: 'Sample: book the dentist' },
  weather: { temp: 12, hi: 15, lo: 7, rain: 40, wind: 18 },
}
const UA = { 'user-agent': 'Gloz/0.1' }
const weatherCache = new Map()   // "lat,lon" -> { at, value }
let google = { value: null, until: 0 }   // a pending or done access token, shared by parallel panels
export function resetCache() { weatherCache.clear(); google = { value: null, until: 0 } }

function googleToken(env) {
  if (google.value && Date.now() < google.until) return google.value
  google = { value: fetchToken(env).catch(e => { google = { value: null, until: 0 }; throw e }), until: Date.now() + 3000e3 }
  return google.value
}

async function fetchToken(env) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GLOZ_GOOGLE_CLIENT_ID, client_secret: env.GLOZ_GOOGLE_CLIENT_SECRET, refresh_token: env.GLOZ_GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  })
  if (!r.ok) throw new Error('google token')
  const j = await r.json()
  google.until = Date.now() + (j.expires_in - 60) * 1000
  return j.access_token
}

async function getJson(url, headers) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

async function weather(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const hit = weatherCache.get(key)
  if (hit && Date.now() - hit.at < 15 * 60000) return hit.value
  const q = new URLSearchParams({ latitude: lat.toFixed(2), longitude: lon.toFixed(2), current: 'temperature_2m,wind_speed_10m', daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max', timezone: 'auto', forecast_days: '1' })
  const j = await getJson(`https://api.open-meteo.com/v1/forecast?${q}`, UA)
  const value = { temp: j.current.temperature_2m, wind: j.current.wind_speed_10m, hi: j.daily.temperature_2m_max[0], lo: j.daily.temperature_2m_min[0], rain: j.daily.precipitation_probability_max[0] ?? 0 }
  weatherCache.set(key, { at: Date.now(), value })
  return value
}

// body: { panels: string[], lat?, lon? }
export async function handle(body, { env }) {
  if (env.GLOZ_SAMPLE === '1') return SAMPLE
  const want = new Set(Array.isArray(body?.panels) ? body.panels : [])
  const has = (...ids) => ids.some(id => want.has(id))
  const out = {}
  const lat = Number(body?.lat), lon = Number(body?.lon)
  const located = body?.lat != null && body?.lon != null && isFinite(lat) && isFinite(lon)
  const jobs = []
  if (has('temp', 'range', 'rain', 'wind')) jobs.push(located ? weather(lat, lon).then(w => { out.weather = w }, () => { out.weather = null }) : (out.weather = null))
  const signedIn = env.GLOZ_GOOGLE_CLIENT_ID && env.GLOZ_GOOGLE_CLIENT_SECRET && env.GLOZ_GOOGLE_REFRESH_TOKEN
  const g = path => googleToken(env).then(t => getJson(path, { authorization: `Bearer ${t}` }))
  if (has('unread')) jobs.push(signedIn ? g('https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX').then(j => { out.unread = j.messagesUnread ?? 0 }, () => { out.unread = null }) : (out.unread = null))
  if (has('event', 'event2')) {
    const q = new URLSearchParams({ timeMin: new Date().toISOString(), maxResults: '2', singleEvents: 'true', orderBy: 'startTime' })
    jobs.push(signedIn ? g(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`).then(j => {
      out.events = (j.items || []).map(e => ({ at: e.start?.dateTime || e.start?.date, allDay: !e.start?.dateTime, title: e.summary || '' }))
    }, () => { out.events = null }) : (out.events = null))
  }
  if (has('tasks', 'task')) {
    const end = new Date(); end.setHours(23, 59, 59, 999)
    const q = new URLSearchParams({ showCompleted: 'false', dueMax: end.toISOString(), maxResults: '100' })
    jobs.push(signedIn ? g(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?${q}`).then(j => {
      const items = (j.items || []).filter(t => t.due).sort((a, b) => a.due.localeCompare(b.due))
      out.tasks = { due: items.length, first: items[0]?.title }
    }, () => { out.tasks = null }) : (out.tasks = null))
  }
  await Promise.all(jobs)
  return out
}
