// Runs Gloz: wires the flow to the glasses, the backend and the outbox.
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { start, step, card, type State, type Event, type Effect } from './core/flow.ts'
import { Outbox, type Store } from './core/outbox.ts'
import { DEFAULT_SETTINGS, type Settings } from './core/types.ts'
import { Glasses } from './glasses.ts'
import { menuItems } from './core/menu.ts'
import type { Mode, ModeCtx } from './modes/types.ts'
import { APPS } from './modes/index.ts'
import { appsList } from './modes/apps.ts'
import { words } from './core/words.ts'
import { holdingReply } from './core/holding.ts'
import { room, roomStep, roomCard, transcript, type Room, type RoomEvent } from './core/room.ts'
import type { Api } from './api.ts'

const store: Store = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
}

export function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(store.get('gloz.settings') || '{}') } } catch { return { ...DEFAULT_SETTINGS } }
}
export function saveSettings(s: Settings) { store.set('gloz.settings', JSON.stringify(s)) }


// Listen mode sends the room's sound in pieces of 4 s (16 kHz, 16-bit: 32,000 bytes a second).
const PIECE = 4 * 32000

// Loudness of 16-bit PCM; below this a piece is silence and is not sent
// (Whisper writes words like "you" for silence).
function loud(parts: Uint8Array[]): boolean {
  let sum = 0, n = 0
  for (const p of parts) { const v = new DataView(p.buffer, p.byteOffset, p.byteLength); for (let i = 0; i + 1 < p.length; i += 2) { const x = v.getInt16(i, true); sum += x * x; n++ } }
  return n > 0 && Math.sqrt(sum / n) > 250
}

export async function runGloz(bridge: EvenAppBridge, api0: Api | null, onState?: (s: State, settings: Settings) => void) {
  let api = api0
  let aiOn = false
  let settings = loadSettings()
  const g = new Glasses(bridge)
  let s: State = start(Boolean(api))
  try { s.seen = JSON.parse(store.get('gloz.seen') || '[]'); s.skippedMsgs = JSON.parse(store.get('gloz.skipped') || '[]') } catch {}
  // Each open asks for every message the server holds; what was answered or skipped here is
  // left out by `seen`, so a message that was on screen but not answered is never lost on a reopen.
  let after = 0
  const muted = new Set<string>(JSON.parse(store.get('gloz.muted') || '[]'))
  let pcm: Uint8Array[] = []
  let listening = false
  let r: Room = room()
  let roomPcm: Uint8Array[] = []
  let roomBytes = 0
  let silentPieces = 0
  let roomNote = ''
  let quiet = false   // listening, and nothing heard yet
  let active: Mode | null = null   // an app from the Apps list, when one is open
  let openedAt = 0                 // when it opened: the way back is shown for the first 3 s

  const outbox = new Outbox(store, p => api ? api.send(p.key, p.msgId, p.text) : Promise.resolve('retry'))

  function render() {
    if (active) { const c = active.card(); g.show(Date.now() - openedAt < 1500 ? { ...c, hint: active === list ? 'double tap: back to messages' : 'double tap: back to the Apps list' } : { ...c, back: 'double tap: back' }); onState?.(s, settings); return }
    g.show(r.on ? { ...roomCard(r, settings.myLang), ...(roomNote ? { text: roomNote } : quiet && !r.paused && !r.lines.length ? { text: words(settings.myLang).nothingHeardYet } : {}) } : card(s, settings.myLang))
    onState?.(s, settings)
  }

  // The room: presses go here while Listen is on; the microphone is off while paused.
  function roomDo(ev: RoomEvent) {
    const was = r
    r = roomStep(r, ev)
    if (was.on && !r.on) store.set('gloz.transcript', transcript(was))
    const micOn = r.on && !r.paused
    if (micOn !== (was.on && !was.paused)) { roomPcm = []; roomBytes = 0; g.mic(micOn).catch(() => {}) }
    if (r.lines.length !== was.lines.length) store.set('gloz.transcript', transcript(r))
    render()
  }
  async function roomPiece() {
    const parts = roomPcm
    roomPcm = []
    roomBytes = 0
    if (!api || !parts.length) return
    if (!loud(parts)) { if (++silentPieces >= 3 && !r.lines.length) { quiet = true; render() } return }
    silentPieces = 0; quiet = false
    const all = new Uint8Array(parts.reduce((n, c) => n + c.length, 0))
    let o = 0
    for (const c of parts) { all.set(c, o); o += c.length }
    try {
      const res = await api.listen(all, settings.myLang, (settings as Settings & { roomLang?: string }).roomLang ?? '')
      const text = res.translated ?? res.text
      if (text) roomDo({ t: 'heard', text, at: Date.now() })
    } catch {}
  }

  let viewSince = Date.now()
  let noteAt = 0
  const names: Record<string, string> = {}
  function dispatch(ev: Event) {
    const r = step(s, ev)
    if (r.s.view !== s.view) viewSince = Date.now()
    if (ev.t === 'note' && ev.text) noteAt = Date.now()
    s = r.s.view !== s.view && ev.t !== 'note' && ev.t !== 'inbox' && r.s.note && r.s.note === s.note && Date.now() - noteAt > 2000 ? { ...r.s, note: undefined } : r.s
    // What was answered, skipped or muted is saved after every change, so a reopen starts from the same place.
    store.set('gloz.seen', JSON.stringify(s.seen))
    store.set('gloz.skipped', JSON.stringify(s.skippedMsgs ?? []))
    render()
    for (const f of r.fx) run(f)
  }

  async function run(f: Effect) {
    switch (f.e) {
      case 'draft':
        if (!api) return
        // If no new reply can be written (no signal, no AI), the wearer's own words become the reply.
        try { dispatch({ t: 'draft', id: f.msg.id, draft: await api.draft(f.msg.id, settings.myLang, f.ask) }) } catch {
          // No signal: the wearer's own words, or the holding reply written here, still go to the outbox.
          dispatch({ t: 'draft', id: f.msg.id, draft: f.ask ? { text: f.ask, by: 'default' } : holdingReply(f.msg.text, settings.myLang) })
        }
        return
      case 'send':
        names[f.msg.id] = f.msg.from
        outbox.add(f.msg.id, f.text)
        await outbox.flush()
        dispatch({ t: 'sent', queued: outbox.size })
        return
      case 'read': api?.read(f.msg.id); store.set('gloz.seen', JSON.stringify(s.seen)); return
      case 'seen': store.set('gloz.seen', JSON.stringify(s.seen)); store.set('gloz.skipped', JSON.stringify(s.skippedMsgs ?? [])); return
      case 'mic':
        listening = f.on
        if (f.on) pcm = []
        await g.mic(f.on).catch(() => {})
        if (!f.on && api) {
          if (pcm.length && !loud(pcm)) { dispatch({ t: 'heard', text: '' }); return }
          const all = new Uint8Array(pcm.reduce((n, c) => n + c.length, 0))
          let o = 0
          for (const c of pcm) { all.set(c, o); o += c.length }
          try { dispatch({ t: 'heard', text: (await api.stt(all, settings.myLang)).text }) } catch { dispatch({ t: 'heard', text: '' }) }
        }
        return
      case 'refresh': { const n = await poll(); const w = words(settings.myLang); dispatch({ t: 'note', text: n < 0 ? w.laterOnline : n ? w.someNew(n) : w.nothingNew }); return }
      case 'later': {
        // A note's clearing clears only that note, never one shown after it.
        const of = f.ev.t === 'note' && !f.ev.text ? s.note : undefined
        setTimeout(() => { if (of !== undefined && s.note !== of) return; dispatch(f.ev) }, f.ms)
        return
      }
    }
  }

  async function poll(): Promise<number> {
    if (!api) return 0
    const used = api
    try {
      const r = await used.inbox(after, settings.myLang, settings.translate)
      after = r.after
      if (!s.online) { outbox.retryNow(); dispatch({ t: 'online', online: true, queued: outbox.size }) }
      const msgs = r.msgs.filter(m => !muted.has(`${m.source}:${m.chat}`))
      if (msgs.length) dispatch({ t: 'inbox', msgs })
      dispatch({ t: 'checked', at: Date.now() })
      return msgs.length
    } catch (e) {
      // The server no longer knows this pairing: say so, not "No signal".
      if ((e as { status?: number }).status === 401 && used === api) { store.set('gloz.token', ''); s = { ...s, paired: false, view: 'pair' }; render(); return 0 }
      if (s.online) dispatch({ t: 'online', online: false, queued: outbox.size })
      return -1
    }
  }

  g.onInput = i => {
    if (i === 'exit') return active === list ? closeApp() : active ? openList() : g.exit()
    if (active) { openedAt = 0; active.input(i); return }
    if (r.on) {
      if (i === 'tap') roomDo({ t: 'tap' })
      const few = r.lines.length - (r.since ?? 0) < 2
      const edge = i === 'prev' ? few || r.at === (r.since ?? 0) : i === 'next' ? few || r.at < 0 : false
      if (edge) { roomNote = r.lines.length - (r.since ?? 0) === 0 && i === 'next' ? words(settings.myLang).nothingHeardYet : i === 'prev' ? words(settings.myLang).nothingEarlier : words(settings.myLang).latestLine; render(); setTimeout(() => { roomNote = ''; render() }, 3000); return }
      if (i === 'prev') roomDo({ t: 'up' })
      if (i === 'next') roomDo({ t: 'down' })
      return
    }
    // A reply must be on screen for 0.6 s before a tap sends it, so a quick double
    // press or a stray touch never sends a reply nobody read.
    if (i === 'tap' && s.view === 'draft' && Date.now() - viewSince < 600) return
    dispatch({ t: i })
  }
  g.onTurn = () => { if (s.note) dispatch({ t: 'note', text: '' }) }
  g.onAudio = chunk => {
    if (active?.audio) { active.audio(chunk); return }
    if (listening) pcm.push(chunk)
    if (r.on && !r.paused) {
      roomPcm.push(chunk)
      roomBytes += chunk.length
      if (roomBytes >= PIECE) roomPiece()
    }
  }
  g.onMenu = async id => {
    const w = words(settings.myLang)
    let note = ''
    if (id === 1 || id === 2) { settings.size = Math.min(6, Math.max(1, settings.size + (id === 1 ? 1 : -1))); note = w.sizeNote(settings.size) }
    if (id === 3) { settings.low = !settings.low; note = settings.low ? w.movedDown : w.movedUp }
    // Without AI on the server, translation cannot run: it stays off and says why.
    if (id === 4) { if (!settings.translate && !aiOn) note = w.needsAi; else { settings.translate = !settings.translate; after = 0; note = settings.translate ? w.translateOn : w.translateOff; g.setMenu(menuItems(settings.myLang, r.on, w.stopListening, false, aiOn ? settings.translate : null)) } }
    if (id === 5) { const m = s.queue[s.at]; if (r.on) { roomNote = w.nothingToMute; setTimeout(() => { roomNote = ''; render() }, 2500) } else if (m && s.view !== 'empty') { muted.add(`${m.source}:${m.chat}`); store.set('gloz.muted', JSON.stringify([...muted])); dispatch({ t: 'mute', key: `${m.source}:${m.chat}` }); note = w.mutedWho(m.from) } else note = w.nothingToMute }
    if (id === 6) { const n = await poll(); note = n < 0 ? w.noSignal : n ? w.someNew(n) : w.nothingNew }
    if (id === 8 && !muted.size) note = w.nothingMuted
    else if (id === 8) { const who = [...new Set((s.mutedMsgs ?? []).map(x => x.from))].join(', '); note = who ? w.unmutedWho(who) : w.unmuted; muted.clear(); store.set('gloz.muted', '[]'); after = 0; dispatch({ t: 'unmute' }); poll() }
    if (id === 9) { if (r.on) roomDo({ t: 'stop' }); openList(); return }
    if (id === 10) { closeApp(); return }
    if (id === 7) { if (r.on) note = r.lines.length ? w.roomStop : w.roomStopEmpty; roomNote = ''; quiet = false; silentPieces = 0; roomDo({ t: r.on ? 'stop' : 'start' }); g.setMenu(menuItems(settings.myLang, r.on, w.stopListening, false, aiOn ? settings.translate : null)) }
    if (note) dispatch({ t: 'note', text: note, ms: 3500 })   // a menu choice is confirmed long enough to look back
    saveSettings(settings)
    g.setLook(settings.size, settings.low, settings.autoPace)
    render()
  }

  // Apps from the glasses menu: each gets the wearer's language, its own server route and the microphone.
  function modeCtx(id: string): ModeCtx {
    return {
      call: body => (api?.mode ? api.mode(id, body) : Promise.reject(new Error('not paired'))),
      lang: () => settings.myLang,
      render,
      mic: on => g.mic(on),
      locate: () => g.locate(),
      store,
    }
  }
  function openApp(m: Mode) {
    active?.stop?.()
    active = m
    openedAt = Date.now()
    setTimeout(() => { if (active === m) render() }, 1600)
    g.setMenu(menuItems(settings.myLang, false, words(settings.myLang).stopListening, true))
    void m.start?.()
    render()
  }
  // The Apps list stays the same object, so it keeps its place when the wearer comes back to it.
  let list: Mode | null = null
  function openList() { list ??= appsList(modeCtx(''), APPS, a => openApp(a.make(modeCtx(a.id)))); openApp(list) }
  function closeApp() {
    active?.stop?.()
    active = null
    g.setMenu(menuItems(settings.myLang, r.on, words(settings.myLang).stopListening, false, aiOn ? settings.translate : null))
    render()
  }

  g.setLook(settings.size, settings.low, settings.autoPace)
  await g.open(menuItems(settings.myLang, false, undefined, false, settings.translate === true))
  render()
  console.log('[gloz] ready')
  poll()
  setInterval(poll, 3000)
  api?.health?.().then(h => { aiOn = Boolean(h?.ai); if (!active) g.setMenu(menuItems(settings.myLang, r.on, words(settings.myLang).stopListening, false, aiOn ? settings.translate : null)) }).catch(() => {})
  // Replies in the outbox go out as soon as the link is back.
  setInterval(async () => {
    if (!outbox.size) return
    const n = await outbox.flush()
    if (n) { dispatch({ t: 'online', online: true, queued: outbox.size }); dispatch({ t: 'delivered' }); const who = n === 1 ? names[outbox.confirmed[0]?.msgId] : undefined
      dispatch({ t: 'note', text: who ? words(settings.myLang).deliveredTo(who) : words(settings.myLang).delivered(n), ms: 4000 }) }
  }, 2000)

  return {
    settings: () => settings,
    update(next: Partial<Settings>) {
      // Translation needs AI on the server: without it the switch stays off and the glasses say why.
      if (next.translate && !aiOn) { next = { ...next, translate: false }; dispatch({ t: 'note', text: words(settings.myLang).needsAi }) }
      settings = { ...settings, ...next }; saveSettings(settings); g.setLook(settings.size, settings.low, settings.autoPace); render() },
    setApi(a: Api) { api = a; dispatch({ t: 'paired' }) },
    transcript: () => store.get('gloz.transcript') || '',
    check() { poll() },
    unmuteAll() { muted.clear(); store.set('gloz.muted', '[]'); after = 0; dispatch({ t: 'unmute' }); poll() },
    muted: () => muted.size,
    top() { g.top() },
  }
}
