// The live demo: the real Gloz app code, with a stand-in for the glasses (a
// 576 x 288 green screen on the page) and a stand-in backend holding sample
// messages. Nothing to install, no sign-in.
import { runGloz } from './app.ts'
import { sampleDash } from './modes/dash.ts'
import { sampleTasks } from './modes/tasks.ts'
import { sampleNotes } from './modes/notes.ts'
import { sampleAsk } from './modes/ask.ts'
import { sampleReader } from './modes/reader.ts'
import { samplePrompter } from './modes/prompter.ts'
import { sampleNav } from './modes/nav.ts'
import { sampleStocks } from './modes/stocks.ts'
import { sampleMusic } from './modes/music.ts'
import { sampleTerm } from './modes/term.ts'
import type { Api } from './api.ts'
import type { Draft, Msg } from './core/types.ts'
import { HOLDING_REPLIES } from './demo-data.ts'
import samples from './demo-inbox.json'

// --- stand-in glasses -----------------------------------------------------------
type Handler = (ev: any) => void
class DemoBridge {
  canvas: HTMLCanvasElement
  g: CanvasRenderingContext2D
  handlers: Handler[] = []
  tiles = new Map<number, { x: number; y: number; img?: ImageBitmap }>()
  constructor(canvas: HTMLCanvasElement) { this.canvas = canvas; this.g = canvas.getContext('2d')! }
  last = 3        // the tile sent last on this page; the screen is drawn when it arrives
  inApp = false   // the glasses menu starts with Back to messages while an app is open
  // A page switch keeps the last picture until the new page's tiles have all arrived, so the page is never black meanwhile.
  private layout(p: any, paint = true) {
    this.inApp = (p.menuObject?.menuItems ?? [])[0]?.itemID === 10
    this.tiles.clear()
    for (const o of p.imageObject || []) this.tiles.set(o.containerID, { x: o.xPosition, y: o.yPosition })
    this.last = Math.max(0, ...this.tiles.keys())
    if (paint) this.paint()
  }
  async createStartUpPageContainer(p: any) { this.layout(p); return 0 }
  async rebuildPageContainer(p: any) { this.layout(p, false); return true }
  async textContainerUpgrade() { return true }
  async updateImageRawData(u: any) {
    const t = this.tiles.get(u.containerID)
    if (!t) return 'imageException'
    t.img = await createImageBitmap(new Blob([u.imageData], { type: 'image/png' }))
    // Both halves of a line change together; a dialog on the glasses stays until answered.
    if (this.mode === 'app' && u.containerID === this.last) this.paint()
    return 'success'
  }
  private paint() {
    const g = this.g
    g.globalCompositeOperation = 'source-over'
    g.fillStyle = '#000'
    g.fillRect(0, 0, 576, 288)
    for (const t of this.tiles.values()) if (t.img) g.drawImage(t.img, t.x, t.y)
    // White on the glasses shows as green.
    g.globalCompositeOperation = 'multiply'
    g.fillStyle = '#3dff7a'
    g.fillRect(0, 0, 576, 288)
    g.globalCompositeOperation = 'source-over'
  }
  onEvenHubEvent(h: Handler) { this.handlers.push(h); return () => {} }
  emit(eventType: number) {
    if (this.mode === 'confirm') {
      if (eventType === 0 || eventType === 3) { this.mode = 'closed'; this.say('Gloz is closed', 'tap: open again'); document.getElementById('meaning')!.style.visibility = 'hidden' }
      else if (eventType === 1 || eventType === 2) { this.mode = 'app'; this.paint() }
      return
    }
    if (this.mode === 'closed') { if (eventType === 0) { this.mode = 'app'; for (const t of this.tiles.values()) t.img = undefined; this.paint(); this.onOpen(); document.getElementById('meaning')!.style.visibility = '' } return }
    for (const h of this.handlers) h({ sysEvent: { eventType } })
  }
  onOpen = () => {}
  menu(itemID: number) { if (this.mode === 'app') for (const h of this.handlers) h({ menuItemClickEvent: { itemID } }) }
  hearing: ReturnType<typeof setInterval> | undefined
  async audioControl(on?: boolean) {
    // No microphone here: inside an app, a hold sends a short sound so the app answers with its sample.
    const send = () => { const pcm = new Uint8Array(16000); for (let k = 0; k < pcm.length; k += 2) pcm[k + 1] = (k / 2) % 40 < 20 ? 0x20 : 0xe0; for (const h of this.handlers) h({ audioEvent: { audioPcm: pcm } }) }
    clearInterval(this.hearing)
    // While the microphone is on in an app, sample sound arrives every half second.
    if (on && this.inApp) { queueMicrotask(send); this.hearing = setInterval(() => { if (this.inApp) send() }, 500) }
    return true
  }
  mode: 'app' | 'confirm' | 'closed' = 'app'
  // Like the glasses: ask first, then close.
  async shutDownPageContainer() { this.mode = 'confirm'; this.say('Close Gloz?', 'tap: close · down: keep open'); return true }
  say(line: string, hint: string) {
    const g = this.g
    g.fillStyle = '#000'; g.fillRect(0, 0, 576, 288)
    g.fillStyle = '#3dff7a'; g.font = '40px system-ui, sans-serif'; g.fillText(line, 12, 140)
    g.fillStyle = '#1f9a49'; g.font = '20px system-ui, sans-serif'; g.fillText(hint, 12, 190)
  }
}

// --- stand-in backend -----------------------------------------------------------
// No microphone here: what an app hears is sample words, and the teleprompter moves on a few words each time.
const heardSample = (f: (b: any) => any, words: string) => (b: any) => b?.action === 'stt' ? { text: words } : f(b)
const SAMPLES: Record<string, (body: any) => any> = { dash: sampleDash, tasks: heardSample(sampleTasks, 'Sample: call the bank'), notes: heardSample(sampleNotes, 'Sample: call the plumber on Friday'), ask: sampleAsk, reader: sampleReader, prompter: (b: any) => b?.action === 'follow' ? { at: (Number(b.from) || 0) + (Number(b.at) || 0) + 4, heard: '', sample: true } : samplePrompter(b), nav: sampleNav, stocks: sampleStocks, music: sampleMusic, term: sampleTerm }
class DemoApi implements Api {
  online = true
  sent: { to: string; text: string; meaning?: string }[] = (() => { try { return JSON.parse(sessionStorage.getItem('gloz.demo.sent') || '[]') } catch { return [] } })()
  glosses: Record<string, string | undefined> = {}
  drafts: Record<string, Draft> = {}
  delivered = 0
  onChange = () => {}
  heard: (() => Promise<string>) | null = null
  async pair() { return 'demo' }
  async inbox(after: number) {
    if (!this.online) throw new Error('offline')
    return { msgs: after ? [] : (samples as unknown as Msg[]).map((m, i) => ({ ...m, at: Date.now() - i * 60000 })), after: 1 }
  }
  async draft(id: string, _lang: string, ask?: string) {
    if (ask) { this.glosses[id] = undefined; return { text: ask, lang: /[^\u0000-\u024F]/.test(ask) ? undefined : 'en', by: 'default' as const } }
    if (!this.online) throw new Error('offline')
    await new Promise(r => setTimeout(r, 350))
    const m = (samples as any[]).find(x => x.id === id)
    // Drafts written by the AI model ahead of time (scripts/demo-drafts.mjs), when present.
    const d = m.draft ? { text: m.draft, gloss: m.gloss, lang: m.draftLang, by: 'ai' as const } : { text: m.holding, gloss: m.lang === 'en' ? undefined : HOLDING_REPLIES.en, lang: m.lang, by: 'default' as const }
    this.glosses[id] = d.gloss
    return d
  }
  waiting: Record<string, string> = {}
  async send(_key: string, id: string, text: string) {
    if (!this.online) { this.waiting[id] = text; this.onChange(); return 'retry' as const }
    delete this.waiting[id]
    const m = (samples as any[]).find(x => x.id === id)
    this.sent.unshift({ to: `${m.from} · ${m.source}`, text, meaning: this.glosses[id] ?? (text === m.holding && m.lang !== 'en' ? HOLDING_REPLIES.en : undefined) })
    try { sessionStorage.setItem('gloz.demo.sent', JSON.stringify(this.sent)) } catch {}
    this.onChange()
    return 'ok' as const
  }
  async read() {}
  async stt() { return { text: this.heard ? await this.heard() : '' } }
  async listen() { return { text: '' } }
  // The apps on the glasses answer with their sample data here, as the server does with GLOZ_SAMPLE=1.
  async mode(id: string, body: unknown) { await new Promise(r => setTimeout(r, 250)); const f = SAMPLES[id]; if (!f) throw new Error('no such app'); return f(body) }
}

// --- page ---------------------------------------------------------------------
// A new visit starts at the first sample; a reopen in the same tab keeps its place.
let sameVisit = false
try { sameVisit = Boolean(sessionStorage.getItem('gloz.demo.visit')); sessionStorage.setItem('gloz.demo.visit', '1') } catch {}
if (!sameVisit) { history.scrollRestoration = 'manual'; scrollTo(0, 0) }
if (!sameVisit) { localStorage.removeItem('gloz.seen'); localStorage.removeItem('gloz.skipped'); localStorage.removeItem('gloz.outbox'); localStorage.removeItem('gloz.muted') }
const canvas = document.getElementById('g2') as HTMLCanvasElement
const bridge = new DemoBridge(canvas)
const api = new DemoApi()
const meaning = document.getElementById('meaning')!
const again = document.getElementById('again')!
try { if (sessionStorage.getItem('gloz.demo.offline')) api.online = false } catch {}
const gloz = await runGloz(bridge as any, api, s => {
  // The sample's meaning in English, under the glasses: part of the sample, not Gloz's output.
  const m = s.queue[s.at] as any
  const on = Boolean(m) && ['message', 'draft', 'thinking', 'sent', 'skipped'].includes(s.view) && m.lang !== 'en' && bridge.mode === 'app' && !bridge.inApp
  meaning.style.visibility = on ? 'visible' : 'hidden'
  // When hidden it is also emptied, so nothing out of date stays in the page.
  meaning.textContent = on ? `What ${m.from} wrote, in English: ${(samples as any[]).find(x => x.id === m.id)?.en ?? ''}` : ' '
  again.hidden = s.view !== 'empty'
  document.getElementById('mute')!.hidden = bridge.inApp || !['message', 'draft'].includes(s.view)
  // The typing box belongs to a reply being spoken; it closes if the wearer moves away.
  const box = document.getElementById('say') as HTMLFormElement
  // Moving away cancels the typed reply: the box closes and nothing is sent or announced.
  if (!box.hidden && s.view !== 'thinking' && s.view !== 'listen') box.hidden = true
})

// Presses: click = tap, double click = double tap, hold = long press, wheel or arrows = swipe.
const CLICK = 0, UP = 1, DOWN = 2, DOUBLE = 3, HOLD = 9, RELEASE = 10
let holdTimer: any = null, held = false, pending: any = null
canvas.addEventListener('pointerdown', () => { held = false; holdTimer = setTimeout(() => { held = true; bridge.emit(HOLD) }, 550) })
canvas.addEventListener('pointerup', () => { clearTimeout(holdTimer); if (held) bridge.emit(RELEASE) })
canvas.addEventListener('click', e => {
  if (held) { held = false; return }
  canvas.focus()
  // The browser counts the clicks: a second click turns the pair into one double tap.
  if (e.detail >= 2) { clearTimeout(pending); pending = null; if (e.detail === 2) bridge.emit(DOUBLE); return }
  pending = setTimeout(() => { pending = null; bridge.emit(CLICK) }, 280)
})
// A click still waiting to see if it is a double click goes first when another press comes.
const flushClick = () => { if (pending) { clearTimeout(pending); pending = null; bridge.emit(CLICK) } }
// One firm wheel movement is one swipe; small scrolls are ignored, and one swipe per 0.6 s.
let wheelSum = 0, wheelAt = 0
canvas.addEventListener('wheel', e => {
  e.preventDefault()
  wheelSum += e.deltaY
  if (Math.abs(wheelSum) < 80 || Date.now() - wheelAt < 600) return
  flushClick()
  bridge.emit(wheelSum > 0 ? DOWN : UP)
  wheelSum = 0
  wheelAt = Date.now()
}, { passive: false })
canvas.addEventListener('keydown', e => {
  const k: Record<string, number> = { Enter: CLICK, ' ': CLICK, ArrowDown: DOWN, ArrowRight: DOWN, ArrowUp: UP, ArrowLeft: UP, Escape: bridge.inApp ? DOUBLE : UP }
  if (k[e.key] === undefined) return
  e.preventDefault()
  flushClick()
  bridge.emit(k[e.key])
})
canvas.focus()

// Voice: the demo has no microphone path to a backend, so the wearer's words are typed.
const sayBox = document.getElementById('say') as HTMLFormElement
const sayIn = document.getElementById('sayin') as HTMLInputElement
const sayLabel = sayBox.querySelector('label')!
const sayText = sayLabel.textContent
api.heard = () => new Promise(res => {
  sayBox.hidden = false
  sayIn.value = ''
  sayLabel.textContent = sayText; sayLabel.style.color = ''; sayLabel.style.fontWeight = ''
  sayIn.focus({ preventScroll: true })
  sayBox.scrollIntoView({ block: 'nearest' })
  // Cancel, or Escape in the field: back to the message, nothing heard, nothing sent.
  const cancel = () => { sayIn.value = ''; sayBox.hidden = true; canvas.scrollIntoView({ block: 'nearest' }); canvas.focus({ preventScroll: true }); bridge.emit(UP) }
  ;(document.getElementById('saycancel') as HTMLButtonElement).onclick = cancel
  sayIn.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); cancel() } }
  sayBox.onsubmit = e => {
    e.preventDefault()
    // Nothing typed: ask for words; the wearer can also swipe up to cancel.
    if (!sayIn.value.trim()) { sayLabel.textContent = 'Type a few words first, or Cancel.'; sayLabel.style.color = '#3dff7a'; sayLabel.style.fontWeight = '700'; sayIn.focus(); return }
    sayLabel.textContent = sayText; sayLabel.style.color = ''; sayLabel.style.fontWeight = ''
    const words = sayIn.value
    sayIn.value = ''
    sayIn.placeholder = 'Type your words'
    sayBox.hidden = true
    canvas.scrollIntoView({ block: 'nearest' })
    canvas.focus({ preventScroll: true })
    res(words)
  }
})

// Signal on and off, to show replies waiting through a drop.
const net = document.getElementById('net') as HTMLButtonElement
if (!api.online) { net.textContent = "Bring the phone's signal back"; net.setAttribute('aria-pressed', 'true') }
net.onclick = () => {
  api.online = !api.online
  try { sessionStorage.setItem('gloz.demo.offline', api.online ? '' : '1') } catch {}
  net.textContent = api.online ? "Cut the phone's signal" : "Bring the phone's signal back"
  net.setAttribute('aria-pressed', String(!api.online))
  gloz.check()
}

// Mute and unmute are the glasses menu items of the same names.
const mute = document.getElementById('mute') as HTMLButtonElement
const unmute = document.getElementById('unmute') as HTMLButtonElement
const apps = document.getElementById('apps') as HTMLButtonElement
const keyScroll = document.getElementById('keyscroll')!, keyDouble = document.getElementById('keydouble')!, keyHold = document.getElementById('keyhold')!
const appsLabel = () => {
  // Home shows only while a tool is open; the tools are reached from home itself.
  apps.hidden = !bridge.inApp
  keyScroll.textContent = bridge.inApp ? 'down: next · up: earlier' : 'down: skip or next · up: earlier'
  keyDouble.textContent = bridge.inApp ? 'back' : 'close'
  keyHold.textContent = bridge.inApp ? 'where the screen offers it' : 'speak a reply, or after the messages ask or add a task'
  if (bridge.inApp) { meaning.style.visibility = 'hidden'; document.getElementById('mute')!.hidden = true }
}
apps.onclick = () => { bridge.menu(10); setTimeout(appsLabel, 50) }
setInterval(appsLabel, 500)
const muteLabel = () => { unmute.hidden = !gloz.muted() }
mute.onclick = () => { bridge.menu(5); setTimeout(muteLabel, 50) }
unmute.onclick = () => { bridge.menu(8); setTimeout(muteLabel, 50) }
setInterval(muteLabel, 1000)
muteLabel()
bridge.onOpen = () => gloz.top()
// 7. while Gloz is closed the buttons wait too
setInterval(() => { for (const b of document.querySelectorAll<HTMLButtonElement>('.row button')) b.disabled = bridge.mode !== 'app' || (b === bigger && gloz.settings().size >= 6) || (b === smaller && gloz.settings().size <= 1) }, 300)

// Size buttons call the same settings the phone screen and glasses menu use.
const bigger = document.getElementById('bigger') as HTMLButtonElement, smaller = document.getElementById('smaller') as HTMLButtonElement
const sizeButtons = () => { bigger.disabled = gloz.settings().size >= 6; smaller.disabled = gloz.settings().size <= 1 }
bigger.onclick = () => { gloz.update({ size: Math.min(6, gloz.settings().size + 1) }); sizeButtons() }
smaller.onclick = () => { gloz.update({ size: Math.max(1, gloz.settings().size - 1) }); sizeButtons() }
sizeButtons()
again.onclick = () => { try { sessionStorage.clear(); localStorage.removeItem('gloz.muted') } catch {} scrollTo(0, 0); history.scrollRestoration = 'manual'; location.reload() }
const lower = document.getElementById('lower')!
const lowerLabel = () => { lower.textContent = gloz.settings().low ? 'Move text higher' : 'Move text lower' }
lowerLabel()
lower.onclick = () => { gloz.update({ low: !gloz.settings().low }); lowerLabel() }

const sentList = document.getElementById('sent')!
const sentHead = document.getElementById('senthead')!
if (!(samples as any[]).some(m => m.draft)) document.getElementById('nokey')!.hidden = false
api.onChange = () => {
  sentHead.hidden = !api.sent.length && !Object.keys(api.waiting).length
  const wait = Object.entries(api.waiting).map(([id, t]) => { const m = (samples as any[]).find(x => x.id === id); const g = api.glosses[id] ?? (t === m.holding && m.lang !== 'en' ? HOLDING_REPLIES.en : undefined); return `<li><b>${m.from} · ${m.source}</b>: waiting for the signal<br>${t.replace(/</g, '&lt;')}${g ? `<br><span class="sub">${g.replace(/</g, '&lt;')}</span>` : ''}</li>` }).join('')   // a waiting reply shows its meaning too
  sentList.innerHTML = wait + api.sent.map(s => `<li><b>${s.to}</b><br>${s.text.replace(/</g, '&lt;')}${s.meaning ? `<br><span class="sub">${s.meaning.replace(/</g, '&lt;')}</span>` : ''}</li>`).join('')
}
api.onChange()

// Real simulator frames of held-out messages: plain G2 text beside Gloz.
fetch('./proof/proof.json').then(r => r.ok ? r.json() : []).then((list: { lang: string; script: string; text: string; pages?: number }[]) => {
  if (!list.length) return
  document.getElementById('pairs')!.innerHTML = list.map(p => `
    <p class="said"><b>${p.script}</b>: <span lang="${p.lang}" dir="auto">${p.text.replace(/</g, '&lt;')}</span></p>
    <div class="pair">
      <figure><img src="./proof/${p.lang}-plain.png" alt="Plain G2 text: what the glasses font draws"><figcaption>Plain G2 text: the words do not show</figcaption></figure>
      <div class="gloz">${Array.from({ length: p.pages ?? 1 }, (_, i) => `<figure><img src="./proof/${p.lang}-gloz${i ? '-' + (i + 1) : ''}.png" alt="Gloz: the same message drawn as an image"><figcaption>Gloz${(p.pages ?? 1) > 1 ? ` page ${i + 1} of ${p.pages}` : ''}</figcaption></figure>`).join('')}</div>
    </div>`).join('')
  document.getElementById('proof')!.hidden = false
}).catch(() => {})
