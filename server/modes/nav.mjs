// Navigation: the place is found with Nominatim (OpenStreetMap search, no key) and the route with
// OSRM (public demo server, no key). Both get a plain User-Agent, one request per wearer action,
// and found places are kept in memory. The start is the phone's position from the request body.
// body: { op: 'say', pcm: base64, lang, lat, lon } or { op: 'route', to: {name, lat, lon, profile}, lat, lon }
import { transcribe } from '../stt.mjs'

const UA = { 'user-agent': 'Gloz/0.1' }
const OSRM_DEMO = 'https://router.project-osrm.org'
// The OSRM demo server routes every profile on car roads with car times (checked: same answer for
// foot and driving), so walking and cycling times are worked out from the distance instead.
const SPEED = { foot: 1.4, cycling: 4.2 }     // metres per second

export const SAMPLE = {
  to: { name: 'Ferry Building', lat: 37.7955, lon: -122.3937, profile: 'foot' },
  steps: [
    { text: 'Head east on Geary St', m: 120, s: 86, at: [37.7873, -122.4074] },
    { text: 'Turn left onto Kearny St', m: 450, s: 321, at: [37.7877, -122.4036] },
    { text: 'Turn right onto Market St', m: 900, s: 643, at: [37.7905, -122.4042] },
    { text: 'Arrive at Ferry Building', m: 0, s: 0, at: [37.7955, -122.3937] },
  ],
  line: [[37.7873, -122.4074], [37.7877, -122.4036], [37.7905, -122.4042], [37.7955, -122.3937]],
  sample: true,
}

const places = new Map()   // search words + area -> place
let lastSearch = 0         // Nominatim allows one request a second

// "walk to the ferry building" -> { profile: 'foot', q: 'the ferry building' }
export function parse(text) {
  const t = String(text).trim().replace(/[.?!]+$/, '')
  const m = t.match(/^(?:(walk|walking|cycle|cycling|bike|biking|ride|drive|driving)\s+)?(?:to\s+)?(.*)$/i)
  const w = (m[1] || '').toLowerCase()
  const profile = /^(cycl|bik|rid)/.test(w) ? 'cycling' : /^driv/.test(w) ? 'driving' : 'foot'
  return { profile, q: m[2].trim() }
}

async function search(q, lat, lon) {
  const key = `${q.toLowerCase()}|${lat.toFixed(1)},${lon.toFixed(1)}`
  if (places.has(key)) return places.get(key)
  const wait = lastSearch + 1100 - Date.now()
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastSearch = Date.now()
  // Places near the wearer come first; farther ones can still match.
  const box = [lon - 0.3, lat + 0.3, lon + 0.3, lat - 0.3].map(n => n.toFixed(4)).join(',')
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&viewbox=${box}&q=${encodeURIComponent(q)}`, { headers: UA, signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`search ${r.status}`)
  const hit = (await r.json())[0]
  const place = hit ? { name: hit.name || String(hit.display_name).split(',')[0], lat: Number(hit.lat), lon: Number(hit.lon) } : null
  places.set(key, place)
  return place
}

const DIRS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']

// One OSRM step as a line: "Turn left onto Market St".
export function say(st, dest) {
  const { type, modifier = '', exit, bearing_after: b = 0 } = st.maneuver
  const onto = st.name ? ` onto ${st.name}` : ''
  if (type === 'depart') return `Head ${DIRS[Math.round(b / 45) % 8]}${st.name ? ` on ${st.name}` : ''}`
  if (type === 'arrive') return `Arrive at ${dest}${modifier === 'left' || modifier === 'right' ? `, on the ${modifier}` : ''}`
  if (type === 'roundabout' || type === 'rotary') return `At the roundabout, take exit ${exit || 1}${onto}`
  if (type === 'fork') return `Keep ${modifier.replace('slight ', '') || 'straight'}${onto}`
  if (type === 'on ramp') return `Take the ramp${onto}`
  if (type === 'off ramp') return `Take the exit${onto}`
  if (type === 'new name' || modifier === 'straight') return `Continue${onto || ' straight'}`
  if (modifier === 'uturn') return `Make a U-turn${onto}`
  if (modifier.startsWith('slight ')) return `Bear ${modifier.slice(7)}${onto}`
  return `Turn ${modifier || 'ahead'}${onto}`
}

async function route(from, to, env) {
  const profile = ['foot', 'cycling', 'driving'].includes(to.profile) ? to.profile : 'foot'
  const base = (env.GLOZ_OSRM_URL || OSRM_DEMO).replace(/\/$/, '')
  const r = await fetch(`${base}/route/v1/${profile}/${from[1]},${from[0]};${to.lon},${to.lat}?steps=true&overview=full&geometries=geojson`, { headers: UA, signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(`route ${r.status}`)
  const j = await r.json()
  const best = j.routes?.[0]
  if (j.code !== 'Ok' || !best) return { error: 'No route found' }
  const slow = base === OSRM_DEMO ? SPEED[profile] : 0
  const steps = best.legs.flatMap(l => l.steps).map(st => ({
    text: say(st, to.name),
    m: Math.round(st.distance),
    s: Math.round(slow ? st.distance / slow : st.duration),
    at: [st.maneuver.location[1], st.maneuver.location[0]],
  }))
  const line = best.geometry.coordinates.map(([x, y]) => [Number(y.toFixed(5)), Number(x.toFixed(5))])
  return { to: { name: to.name, lat: to.lat, lon: to.lon, profile }, steps, line }
}

// stt: speech to text (the server engine; tests pass a stand-in).
export async function handle(body, { env, stt = transcribe }) {
  if (env.GLOZ_SAMPLE === '1') return SAMPLE
  if (typeof body?.lat !== 'number' || typeof body?.lon !== 'number') return { error: 'No position: allow location on the phone' }
  const from = [Number(body.lat), Number(body.lon)]
  try {
    if (body?.op === 'route') {
      const t = body.to || {}
      if (!Number.isFinite(t.lat) || !Number.isFinite(t.lon)) return { error: 'No place given' }
      return await route(from, { name: String(t.name || 'destination'), lat: t.lat, lon: t.lon, profile: t.profile }, env)
    }
    if (body?.op === 'say') {
      let text
      try { text = (await stt(Buffer.from(String(body.pcm || ''), 'base64'), String(body.lang || 'en'))).text } catch { return { error: 'Speech to text is not set up on the Gloz server' } }
      const { profile, q } = parse(text || '')
      if (!q) return { error: 'Nothing heard' }
      const p = await search(q, from[0], from[1])
      if (!p) return { error: `Not found: ${q}`.slice(0, 60) }
      return await route(from, { ...p, profile }, env)
    }
  } catch (e) { return { error: `No route: ${String(e.message || e).slice(0, 40)}` } }
  return { error: 'Unknown request' }
}
