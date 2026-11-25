// The phone screens with sample data: the public page at /phone/ and screen tests.
// ?screen=pair|server|settings  &said=1 (a transcript)  &muted=2  &wrong=1 (the server refuses the code)
// &slow=ms (pairing takes this long)  &net=1 (pairing calls ./pair over the network)
import { pairScreen, settingsScreen } from './mount'
import { phoneStatus } from './strings'
import type { Settings } from '../core/types'

const q = new URLSearchParams(location.search)
const root = document.getElementById('phone')!
// With no options (the public page at /phone/), it starts at pairing, as a new phone does.
const screen = q.get('screen') ?? 'pair'
const slow = Number(q.get('slow') ?? 300)
const s = { myLang: 'en', size: 3, low: false, translate: false, autoPace: true, roomLang: '' } as Settings & { roomLang?: string }
let said = q.get('said') || !q.get('screen') ? '14:02  We can ship on Friday.\n14:02  The price stays the same.\n14:03  Legal needs one more day.' : ''
let status = ''
let muted = Number(q.get('muted') ?? (q.get('screen') ? 0 : 2))
let toRead = 3
// The check changes these to see live updates arrive without moving focus.
Object.assign(window, { __gloz: { setStatus: (v: string) => { status = v }, addSaid: (v: string) => { said += '\n' + v } } })
const pair = async () => {
  if (q.get('net')) { const r = await fetch('./pair', { method: 'POST' }); if (!r.ok) throw Object.assign(new Error('refused'), { status: r.status }); return }
  await new Promise(ok => setTimeout(ok, slow))
  if (q.get('wrong')) throw Object.assign(new Error('refused'), { status: 403 })
}
// Sample chats, as the glasses app lists the chats it has seen.
const picked = new Set<string>()
const chats = () => [['telegram:Board', 'Board · telegram'], ['slack:#launch', '#launch · slack'], ['gmail:Layla', 'Layla · gmail']].map(([key, label]) => ({ key, label, on: picked.has(key) }))
// The sample note is for pairing; the settings screen does not need it.
const settings = () => (document.getElementById('samplenote')?.remove(), settingsScreen(root, s, () => {}, () => status || phoneStatus(toRead, 1, muted * 2, 0), () => said, () => muted, () => { toRead += muted * 2; muted = 0 }, undefined, chats, (k, on) => { if (on) picked.add(k); else picked.delete(k) }))
// A code that pairs leads on to the settings screen, as in the app.
if (screen === 'settings') settings()
else pairScreen(root, screen === 'server' ? '' : 'https://gloz.example.org', async (b, code) => { await pair(); void b; void code; void settings() })
