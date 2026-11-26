// Runs Gloz: wires the flow to the glasses, the backend and the outbox.
import { doubleTap } from './core/back.ts'
import { shows } from './core/chats.ts'
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { start, step, card, type State, type Event, type Effect } from './core/flow.ts'
import { Outbox, type Store } from './core/outbox.ts'
import { DEFAULT_SETTINGS, type Settings, type Card } from './core/types.ts'
import { Glasses } from './glasses.ts'
import { menuItems } from './core/menu.ts'
import { APPS } from './modes/index.ts'
import type { Mode, ModeCtx } from './modes/types.ts'
import { dayItems, type DayItem } from './core/day.ts'
import { said, type Said } from './core/say.ts'
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
  // Hints fade once known: in a tool, a press used 5 times drops out of the hint (at least one press stays).
  const VERB: Record<string, string> = { tap: 'tap', next: 'down', prev: 'up', hold: 'hold', exit: 'double tap' }
  let known: Record<string, number> = {}
  try { known = JSON.parse(store.get('gloz.known') || '{}') } catch {}
  const knows = (v: string) => (known[`${active?.id}:${v}`] || 0) >= 5
  function used(i: string) { const v = VERB[i]; if (!active || !v) return; const k = `${active.id}:${v}`; known[k] = (known[k] || 0) + 1; store.set('gloz.known', JSON.stringify(known)) }
  function fade(h?: string) {
    if (!h) return h
    const parts = h.split(' · '), keep = parts.filter(p => !(p.includes(':') && knows(p.split(':')[0])))
    return (keep.some(p => p.includes(':')) ? keep : parts).join(' · ')
  }
  // Chats the wearer picked on the phone: when any are picked, only they reach the glasses.
  const only = new Set<string>(JSON.parse(store.get('gloz.only') || '[]'))
  const chats = new Map<string, string>(JSON.parse(store.get('gloz.chats') || '[]'))   // chat key -> "chat · service", newest last
  let pcm: Uint8Array[] = []
  let listening = false
  let r: Room = room()
  let roomPcm: Uint8Array[] = []
  let roomBytes = 0
  let silentPieces = 0
  let roomNote = ''
  let quiet = false   // listening, and nothing heard yet
  let active: Mode | null = null   // a tool (tasks, reader, directions...) while it is open
  // Home, once the messages are done: the inbox line, then the wearer's day, one item at a time.
  // A hold there means "say anything": the words go to the tool that does them.
  let day: DayItem[] = []
  let dayAt = 0          // 0: the inbox line; 1..n: the day's items
  let homeNote = ''
  let saying: '' | 'listening' | 'working' = ''
  let sayPcm: Uint8Array[] = []
  let sayGen = 0
  let sayTo: Mode | null = null   // the tool the words go to; null on home
  let toolNote = ''                // a short note over a tool's hint (nothing heard)
  const home = () => !active && !r.on && s.paired && s.view === 'empty'

  const outbox = new Outbox(store, p => api ? api.send(p.key, p.msgId, p.text) : Promise.resolve('retry'))

  function render() {
    if (home() || saying) { g.show(homeCard()); onState?.(saying ? { ...s, view: 'listen' } : s, settings); return }
    if (active) { const c = active.card(), h = fade(c.hint); g.show(toolNote ? { ...c, hint: toolNote } : c.hint?.includes('double tap') || knows('double tap') ? { ...c, hint: h } : { ...c, hint: h, back: 'double tap: back' }); onState?.(s, settings); return }
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
    if (r.s.view === 'empty' && s.view !== 'empty') { dayAt = 0; void loadDay() }
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
          try { dispatch({ t: 'heard', text: (await api.stt(all, settings.myLang)).text }) } catch (e) { dispatch({ t: 'heard', text: '' }); if (/stt 503/.test(String(e))) dispatch({ t: 'note', text: 'No speech engine on the server', ms: 3500 }) }
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
      for (const m of r.msgs) { const k = `${m.source}:${m.chat}`; chats.delete(k); chats.set(k, `${m.chat} · ${m.source}`) }
      while (chats.size > 30) chats.delete(chats.keys().next().value!)
      if (r.msgs.length) store.set('gloz.chats', JSON.stringify([...chats]))
      const msgs = r.msgs.filter(m => shows(`${m.source}:${m.chat}`, muted, only))
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
    used(i)
    if (i === 'exit' && active?.back?.()) return render()
    if (i === 'exit' && saying) { sayGen++; saying = ''; sayTo = null; g.mic(false).catch(() => {}); return render() }
    if (i === 'exit' && !active && (s.view === 'listen' || (s.view === 'thinking' && s.hearing))) return dispatch({ t: 'cancel' })
    if (i === 'exit') return doubleTap(active) === 'home' ? closeApp() : g.exit()
    if (saying) return homeInput(i)
    if (active?.say && i === 'hold') { sayTo = active; saying = 'listening'; sayPcm = []; g.mic(true).catch(() => {}); return render() }
    if (active) { active.input(i); return }
    if (home()) return homeInput(i)
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
    if (saying === 'listening') { sayPcm.push(chunk); return }
    if (active?.audio) { active.audio(chunk); return }
    if (listening) pcm.push(chunk)
    if (r.on && !r.paused) {
      roomPcm.push(chunk)
      roomBytes += chunk.length
      if (roomBytes >= PIECE) roomPiece()
    }
  }
  // The platform closes its menu in its own time: the note shown under it starts again when it has gone.
  let menuNote = ''
  g.onMenuClosed = () => { const n = menuNote; menuNote = ''; if (n && home()) flash(n); else if (n) dispatch({ t: 'note', text: n, ms: 3500 }) }
  const rootMenu = () => g.setMenu(menuItems(settings.myLang, r.on, words(settings.myLang).stopListening, false, aiOn ? settings.translate : null, muted.size > 0))
  g.onMenu = async id => {
    const w = words(settings.myLang)
    let note = ''
    if (id === 1 || id === 2) { settings.size = Math.min(7, Math.max(1, settings.size + (id === 1 ? 1 : -1))); note = w.sizeNote(settings.size) }
    if (id === 3) { settings.low = !settings.low; note = settings.low ? w.movedDown : w.movedUp }
    // Without AI on the server, translation cannot run: it stays off and says why.
    if (id === 4) { if (!settings.translate && !aiOn) note = w.needsAi; else { settings.translate = !settings.translate; after = 0; note = settings.translate ? w.translateOn : w.translateOff; rootMenu() } }
    if (id === 5) { const m = s.queue[s.at]; if (r.on) { roomNote = w.nothingToMute; setTimeout(() => { roomNote = ''; render() }, 2500) } else if (m && s.view !== 'empty') { muted.add(`${m.source}:${m.chat}`); store.set('gloz.muted', JSON.stringify([...muted])); dispatch({ t: 'mute', key: `${m.source}:${m.chat}` }); note = w.mutedWho(m.from); rootMenu() } else note = w.nothingToMute }
    if (id === 6) { const n = await poll(); note = n < 0 ? w.noSignal : n ? w.someNew(n) : w.nothingNew }
    if (id === 8 && !muted.size) note = w.nothingMuted
    else if (id === 8) { const who = [...new Set((s.mutedMsgs ?? []).map(x => x.from))].join(', '); note = who ? w.unmutedWho(who) : w.unmuted; muted.clear(); store.set('gloz.muted', '[]'); after = 0; dispatch({ t: 'unmute' }); poll(); rootMenu() }
    if (id === 10) { closeApp(); return }
    if (id === 7) { if (r.on) note = r.lines.length ? w.roomStop : w.roomStopEmpty; roomNote = ''; quiet = false; silentPieces = 0; roomDo({ t: r.on ? 'stop' : 'start' }); rootMenu() }
    menuNote = note
    if (note && home()) flash(note)
    else if (note) dispatch({ t: 'note', text: note, ms: 3500 })   // a menu choice is confirmed long enough to look back
    saveSettings(settings)
    g.setLook(settings.size, settings.low, settings.autoPace)
    render()
  }

  // Each tool gets the wearer's language, its own server route and the microphone.
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
  function openApp(m: Mode): Promise<void> {
    active?.stop?.()
    active = m
    g.setMenu(menuItems(settings.myLang, false, words(settings.myLang).stopListening, true))
    const started = Promise.resolve(m.start?.()).then(() => {})
    render()
    return started
  }
  const TOOLS = Object.fromEntries(APPS.map(a => [a.id, a]))
  // Opens the tool behind a day item or a request; words said for it are handed over once it has loaded.
  function openTool(tool: string, arg?: string) {
    const a = TOOLS[tool]
    if (!a) return
    const m = a.make(modeCtx(a.id))
    void openApp(m).then(() => { if (arg && active === m) m.say?.(arg) })
  }

  // Home: the inbox line first (tap checks now), then the day; text is the item, the hint says each press.
  const SAY_WHAT: Record<string, string> = { nav: 'where', tasks: 'the task', notes: 'the note', ask: 'your question', term: 'the command', reader: 'the title' }
  function homeCard(): Card {
    const w = words(settings.myLang)
    if (saying === 'listening') return { kind: 'status', text: `Listening · say ${SAY_WHAT[sayTo?.id ?? ''] ?? 'what you want'}`, hint: 'let go or tap: done · double tap: cancel' }
    if (saying === 'working') return { kind: 'status', text: 'Getting your words…', hint: 'wait a moment · double tap: cancel' }
    const base = card(s, settings.myLang)
    if (s.note && !homeNote) return base
    const n = day.length + 1
    const skipped = s.skippedMsgs?.length ?? 0
    if (dayAt === 0) return { kind: 'status', text: homeNote || base.text, hint: ['tap: check now', day.length && 'down: your day', skipped && w.showSkipped(skipped), 'hold: ask, or add a task'].filter(Boolean).join(' · '), progress: day.length ? [1, n] : undefined }
    const it = day[dayAt - 1]
    if (homeNote) return { kind: 'status', text: homeNote, hint: 'down: next · hold: ask, or add a task', progress: [dayAt + 1, n] }
    return { kind: 'status', text: it.text, hint: [it.sample && 'sample', it.tool === 'dash' ? 'tap: your day at a glance' : 'tap: open', 'down: next', 'up: earlier', 'double tap: close'].filter(Boolean).join(' · '), progress: [dayAt + 1, n] }
  }
  function flash(text: string) {
    homeNote = text
    render()
    setTimeout(() => { if (homeNote === text) { homeNote = ''; render() } }, 3500)
  }
  function homeInput(i: string) {
    if (saying === 'listening') { if (i === 'release' || i === 'tap') void finishSay(); return }
    if (saying === 'working') { if (i === 'prev') { sayGen++; saying = ''; sayTo = null; render() } return }   // the demo's Cancel
    if (homeNote && i === 'tap') { homeNote = ''; return render() }
    if (i === 'hold') { sayTo = null; saying = 'listening'; sayPcm = []; homeNote = ''; g.mic(true).catch(() => {}); return render() }
    if (i === 'release') return
    if (i === 'next') { dayAt = dayAt < day.length ? dayAt + 1 : 0; homeNote = ''; return render() }
    if (i === 'prev') { if (dayAt > 0) { dayAt--; homeNote = ''; return render() } return dispatch({ t: 'prev' }) }
    if (i === 'tap') { if (dayAt === 0) return dispatch({ t: 'tap' }); openTool(day[dayAt - 1].tool) }
  }
  async function finishSay() {
    const my = ++sayGen
    let noEngine = false   // the server has no speech engine: say that, not "didn't catch that"
    g.mic(false).catch(() => {})
    saying = 'working'
    render()
    let text = ''
    try {
      if (!api) throw new Error('not paired')
      const parts = sayPcm
      sayPcm = []
      if (parts.length && !loud(parts)) text = ''
      else {
        const all = new Uint8Array(parts.reduce((n, c) => n + c.length, 0))
        let o = 0
        for (const c of parts) { all.set(c, o); o += c.length }
        text = (await api.stt(all, settings.myLang)).text || ''
      }
    } catch (e) { text = ''; if (/stt 503/.test(String(e))) noEngine = true }
    if (my !== sayGen) return
    saying = ''
    if (sayTo) { const to = sayTo; sayTo = null; const other = said(text); if (other && !other.guess && other.tool !== to.id) { if (other.op) { closeApp(); return act(other) } closeApp(); return openTool(other.tool, other.arg) } if (text.trim() && active === to) to.say!(text.trim()); else if (active === to) { const n = noEngine ? 'No speech engine on the server' : words(settings.myLang).notHeard; toolNote = n; render(); setTimeout(() => { if (toolNote === n) { toolNote = ''; render() } }, 3500) } return }
    const it = said(text)
    if (!it) return flash(noEngine ? 'No speech engine on the server' : words(settings.myLang).notHeard)
    await act(it)
  }
  // Quick requests are done on the spot and confirmed; the rest open their tool with the words.
  const short = (t = '') => (t.length > 22 ? t.slice(0, 21).replace(/\s+\S*$/, '') + '…' : t)
  async function act(it: Said) {
    const call = (id: string, body: unknown) => (api?.mode ? api.mode(id, body) : Promise.reject(new Error('not paired')))
    try {
      if (it.tool === 'tasks' && it.op === 'add') { const r = await call('tasks', { action: 'add', title: it.arg }); flash(r?.error || `✓ Task${r?.sample ? ' (sample)' : ''}: ${short(it.arg)}`); return void loadDay() }
      if (it.tool === 'notes' && it.op === 'add') { const r = await call('notes', { action: 'add', text: it.arg }); flash(r?.error || `✓ Note${r?.sample ? ' (sample)' : ''}: ${short(it.arg)}`); return void loadDay() }
      // Music: the command runs, then the player opens, so pause and next track are one press away.
      if (it.tool === 'music' && it.op) { const r = await call('music', { action: it.op }); if (r?.error || r?.need) return flash(r.error || r.need); return openTool('music') }
    } catch { return flash(words(settings.myLang).noSignal) }
    openTool(it.tool, it.arg)
  }
  async function loadDay() {
    if (!api?.mode) return
    const get = (id: string, body: unknown) => api!.mode!(id, body).then(x => (x && !x.error ? x : null)).catch(() => null)
    const [dash, music, stocks, notes, reader, prompter, term, tasks] = await Promise.all([
      get('dash', { panels: ['event', 'tasks', 'temp', 'range'] }), get('music', { action: 'now' }), get('stocks', { op: 'quotes' }),
      get('notes', { action: 'list' }), get('reader', { action: 'list' }), get('prompter', { action: 'list' }), get('term', { op: 'list' }), get('tasks', { action: 'list' })])
    day = dayItems({ dash, music, stocks, notes, reader, prompter, term, tasks }, settings.myLang)
    dayAt = Math.min(dayAt, day.length)
    if (home()) render()
  }
  function closeApp() {
    active?.stop?.()
    active = null
    void loadDay()   // what changed in the tool (a task done, the next track) shows at once
    rootMenu()
    render()
  }

  g.setLook(settings.size, settings.low, settings.autoPace)
  await g.open(menuItems(settings.myLang, false, undefined, false, null))
  render()
  console.log('[gloz] ready')
  poll()
  setInterval(poll, 3000)
  void loadDay()
  setInterval(() => { if (home()) void loadDay() }, 60000)
  api?.health?.().then(h => { aiOn = Boolean(h?.ai); if (!active) rootMenu() }).catch(() => {})
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
    setApi(a: Api) { api = a; dispatch({ t: 'paired' }); void loadDay() },
    transcript: () => store.get('gloz.transcript') || '',
    check() { poll() },
    unmuteAll() { muted.clear(); store.set('gloz.muted', '[]'); after = 0; dispatch({ t: 'unmute' }); poll() },
    muted: () => muted.size,
    chats: () => [...chats].reverse().slice(0, 12).map(([key, label]) => ({ key, label, on: only.has(key), muted: muted.has(key) })),
    pick(key: string, on: boolean) { if (on) only.add(key); else only.delete(key); store.set('gloz.only', JSON.stringify([...only])); after = 0; poll() },
    top() { g.top() },
  }
}
