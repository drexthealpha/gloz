// Gloz entry point inside the Even Realities app.
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { HttpApi } from './api.ts'
import { SampleApi } from './sample-api.ts'
import { runGloz } from './app.ts'
import { pairScreen, settingsScreen } from './phone/mount.tsx'
import { phoneStatus, t } from './phone/strings.ts'

const BACKEND = (import.meta.env.VITE_GLOZ_BACKEND as string) || ''
const root = document.getElementById('phone')!
const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const put = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }

// A pairing link starts a fresh pairing: what was kept for an old one goes, before anything reads it.
const q = new URLSearchParams(location.search)
const link = q.get('backend') && q.get('code') ? { backend: q.get('backend')!, code: q.get('code')! } : null
// fresh=1 (recordings and test walks) also starts from the usual settings.
if (link && q.get('fresh')) put('gloz.settings', '')
if (link) { for (const k of ['gloz.token', 'gloz.outbox', 'gloz.seen', 'gloz.skipped', 'gloz.after', 'gloz.backend']) put(k, ''); history.replaceState(null, '', location.pathname) }

const bridge = await waitForEvenAppBridge()
const base = get('gloz.backend') || BACKEND
const token = get('gloz.token')
let status = 'Paired'
// Until the phone pairs, the glasses show sample messages (marked "Sample:") so the wearer sees Gloz work at once.
const gloz = await runGloz(bridge, token ? new HttpApi(base, token) : link ? null : new SampleApi(), (s) => {
  status = !s.online ? `${t('noSignal')}${s.queued ? ` · ${t('waitingSignal', s.queued)}` : ''}` : phoneStatus(Math.max(0, s.queue.length - (s.view === 'empty' ? 0 : s.at)), s.skippedMsgs?.length ?? 0, s.mutedMsgs?.length ?? 0, s.queued)
})

function showSettings() { settingsScreen(root, gloz.settings(), n => gloz.update(n), () => status, () => gloz.transcript(), () => gloz.muted(), () => gloz.unmuteAll(), () => gloz.settings(), () => gloz.chats(), (k, on) => gloz.pick(k, on), unpair) }

// This phone's pairing ends at once on the server; pairing again needs a new code.
async function unpair() {
  const t = get('gloz.token')
  if (t) await fetch(`${base}/unpair`, { method: 'POST', headers: { authorization: `Bearer ${t}` } }).catch(() => {})
  for (const k of ['gloz.token', 'gloz.outbox', 'gloz.seen', 'gloz.skipped', 'gloz.after']) put(k, '')
  // Starting again with no token shows pairing on the phone and on the glasses.
  location.reload()
}

async function pair(b: string, code: string) {
  const api = new HttpApi(b, '')
  const t = await api.pair(code)
  put('gloz.backend', b)
  put('gloz.token', t)
  gloz.setApi(api)
  showSettings()
}

// One scan pairs: `evenhub qr --url "http://<ip>:5173/?backend=<url>&code=<code>"`.
if (link) pair(link.backend, link.code).catch(() => pairScreen(root, link.backend, pair))
else if (token) showSettings()
else pairScreen(root, base, pair)
