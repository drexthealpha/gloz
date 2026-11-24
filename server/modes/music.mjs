// Now playing on the wearer's Spotify account (Web API). Keys come from env:
// GLOZ_SPOTIFY_CLIENT_ID, GLOZ_SPOTIFY_CLIENT_SECRET, GLOZ_SPOTIFY_REFRESH_TOKEN.
export const SAMPLE = { track: 'Clair de lune', artist: 'Claude Debussy', playing: true, sample: true }
// Sample data that answers presses the way a music account would, for this run of the server.
const TRACKS = [['Clair de lune', 'Claude Debussy'], ['Gymnopedie No. 1', 'Erik Satie'], ['The Swan', 'Camille Saint-Saens']]
const played = { at: 0, playing: true }
function sample(action) {
  if (action === 'pause') played.playing = false
  if (action === 'play') played.playing = true
  if (action === 'next') { played.at = (played.at + 1) % TRACKS.length; played.playing = true }
  const [track, artist] = TRACKS[played.at]
  return { track, artist, playing: played.playing, sample: true }
}
export const NEED = 'Connect a music account on the Gloz server'
const API = 'https://api.spotify.com/v1/me/player'

let token = { value: '', until: 0 }
export function resetToken() { token = { value: '', until: 0 } }

async function access(env) {
  if (token.value && Date.now() < token.until) return token.value
  const basic = Buffer.from(`${env.GLOZ_SPOTIFY_CLIENT_ID}:${env.GLOZ_SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.GLOZ_SPOTIFY_REFRESH_TOKEN }),
  })
  if (!r.ok) throw Object.assign(new Error('Spotify sign-in failed: reconnect on the Gloz server'), { shown: true })
  const j = await r.json()
  token = { value: j.access_token, until: Date.now() + (j.expires_in - 60) * 1000 }
  return token.value
}

// Play and pause are PUT, next is POST (Spotify Web API reference).
const CONTROL = { play: ['PUT', '/play'], pause: ['PUT', '/pause'], next: ['POST', '/next'] }

// body: { action: 'now' | 'play' | 'pause' | 'next' }
export async function handle(body, { env }) {
  if (env.GLOZ_SAMPLE === '1') return sample(body?.action)
  if (!env.GLOZ_SPOTIFY_CLIENT_ID || !env.GLOZ_SPOTIFY_CLIENT_SECRET || !env.GLOZ_SPOTIFY_REFRESH_TOKEN) return { need: NEED }
  try {
    const auth = { authorization: `Bearer ${await access(env)}` }
    const c = CONTROL[body?.action]
    if (c) {
      const r = await fetch(API + c[1], { method: c[0], headers: auth, signal: AbortSignal.timeout(10000) })
      if (r.status === 404) return { error: 'No active player: start music on a device' }
      if (r.status === 403) return { error: 'Spotify Premium is needed for controls' }
      if (!r.ok) return { error: `Spotify ${r.status}` }
    }
    const r = await fetch(`${API}/currently-playing`, { headers: auth, signal: AbortSignal.timeout(10000) })
    if (r.status === 204) return {}
    if (!r.ok) return { error: `Spotify ${r.status}` }
    const j = await r.json()
    if (!j?.item) return {}
    // After play or pause the reply can lag a moment: the action decides the state shown.
    const playing = body?.action === 'play' ? true : body?.action === 'pause' ? false : Boolean(j.is_playing)
    return { track: j.item.name, artist: (j.item.artists || []).map(a => a.name).join(', '), playing }
  } catch (e) {
    return { error: e.shown ? e.message : 'No signal to Spotify' }
  }
}
