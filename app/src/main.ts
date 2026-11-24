// Gloz entry point inside the Even Realities app.
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { HttpApi } from './api.ts'
import { runGloz } from './app.ts'
import { pairScreen, settingsScreen } from './phone/mount.tsx'
import { phoneStatus } from './phone/strings.ts'

const BACKEND = (import.meta.env.VITE_GLOZ_BACKEND as string) || ''
const root = document.getElementById('phone')!
const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const put = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }

// A pairing link starts a fresh pairing: what was kept for an old one goes, before anything reads it.
const q = new URLSearchParams(location.search)
const link = q.get('backend') && q.get('code') ? { backend: q.get('backend')!, code: q.get('code')! } : null
if (link) { for (const k of ['gloz.token', 'gloz.outbox', 'gloz.seen', 'gloz.skipped', 'gloz.after', 'gloz.backend']) put(k, ''); history.replaceState(null, '', location.pathname) }

const bridge = await waitForEvenAppBridge()
const base = get('gloz.backend') || BACKEND
const token = get('gloz.token')
let status = 'Paired'
const gloz = await runGloz(bridge, token ? new HttpApi(base, token) : null, (s) => {
  status = !s.online ? `No signal${s.queued ? ` · ${s.queued} reply waiting` : ''}` : phoneStatus(Math.max(0, s.queue.length - (s.view === 'empty' ? 0 : s.at)), s.skippedMsgs?.length ?? 0, s.mutedMsgs?.length ?? 0, s.queued)
})

function showSettings() { settingsScreen(root, gloz.settings(), n => gloz.update(n), () => status, () => gloz.transcript(), () => gloz.muted(), () => gloz.unmuteAll(), () => gloz.settings(), () => gloz.chats(), (k, on) => gloz.pick(k, on)) }

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
