// What the wearer sees and what each press does. Pure: no timers, no network.
// Inputs are events; outputs are the next state plus effects for the shell to run.
import type { Card, Draft, Msg } from './types'
import { words, langName } from './words.ts'

export type View = 'message' | 'draft' | 'listen' | 'thinking' | 'sent' | 'skipped' | 'empty' | 'pair'

export interface State {
  queue: Msg[]                      // unread, newest first
  at: number                        // index of the message on screen
  view: View
  drafts: Record<string, Draft | 'pending' | 'failed'>
  queued: number                    // replies waiting in the outbox
  online: boolean
  paired: boolean
  heard?: string                    // last words the speech server returned
  seen: string[]                    // answered or skipped: never shown again
  checkedAt?: number                // last time the inbox was checked
  mutedMsgs?: Msg[]                 // muted here; back with Unmute
  heldFrom?: 'draft' | 'message'   // where a hold started, so going back returns there
  skippedMsgs?: Msg[]               // skipped here, still unread at the source; can come back
  note?: string                     // a short word in place of the hint for a moment ("Checked ✓")
  sendResult?: 'sent' | 'saved'    // what the outbox said about the last send
  hearing?: boolean                 // speech is being turned into words
}

export type Event =
  | { t: 'tap' } | { t: 'next' } | { t: 'prev' } | { t: 'hold' } | { t: 'release' }
  | { t: 'inbox'; msgs: Msg[] }
  | { t: 'draft'; id: string; draft: Draft | null }
  | { t: 'heard'; text: string }
  | { t: 'sent'; queued: number }
  | { t: 'online'; online: boolean; queued: number }
  | { t: 'paired' }
  | { t: 'done'; id?: string }      // the "Sent" or "Skipped" line has been up long enough, for this message
  | { t: 'checked'; at: number }
  | { t: 'note'; text: string; ms?: number; was?: string }
  | { t: 'cancel' }
  | { t: 'delivered' }
  | { t: 'mute'; key: string }      // source:chat
  | { t: 'unmute' }

export type Effect =
  | { e: 'draft'; msg: Msg; ask?: string }
  | { e: 'send'; msg: Msg; text: string }
  | { e: 'mic'; on: boolean }
  | { e: 'read'; msg: Msg }         // answered: mark as read at the source
  | { e: 'seen'; msg: Msg }         // skipped: never shown again here, still unread at the source
  | { e: 'refresh' }
  | { e: 'later'; ms: number; ev: Event }

export function start(paired: boolean): State {
  return { queue: [], at: 0, view: paired ? 'empty' : 'pair', drafts: {}, queued: 0, online: true, paired, seen: [] }
}

// One word is enough to act. Anything else the wearer says becomes an
// instruction for a new draft, which still waits for a tap or "send".
const WORDS: Record<string, 'send' | 'skip' | 'back'> = {
  send: 'send', yes: 'send', 'send it': 'send', skip: 'skip', next: 'skip', later: 'skip', back: 'back',
  'أرسل': 'send', 'ارسل': 'send', 'بفرست': 'send', 'भेजो': 'send', 'ส่ง': 'send', 'שלח': 'send',
  '送信': 'send', '보내': 'send', '发送': 'send', '發送': 'send', 'отправь': 'send', 'отправить': 'send',
}
export function word(text: string): 'send' | 'skip' | 'back' | null {
  const w = text.toLowerCase().replace(/[.!?,。！？،]/g, '').trim()
  return WORDS[w] ?? null
}

function current(s: State): Msg | undefined { return s.queue[s.at] }

function advance(s: State, fx: Effect[]): State {
  const msg = current(s)
  if (msg) fx.push({ e: s.view === 'skipped' ? 'seen' : 'read', msg })
  const queue = s.queue.filter((_, i) => i !== s.at)
  const at = Math.min(s.at, Math.max(0, queue.length - 1))
  const seen = msg ? [...s.seen, msg.id].slice(-500) : s.seen
  const skippedMsgs = msg && s.view === 'skipped' ? [...(s.skippedMsgs ?? []).filter(x => x.id !== msg.id), msg] : (s.skippedMsgs ?? []).filter(x => x.id !== msg?.id)
  const next = { ...s, queue, at, seen, skippedMsgs, heard: undefined, view: (queue.length ? 'message' : 'empty') as View }
  return prefetch(next, fx)
}

// Ask for the draft as soon as a message is on screen, so it is ready by the tap.
function prefetch(s: State, fx: Effect[]): State {
  const msg = current(s)
  if (!msg || s.drafts[msg.id]) return s
  fx.push({ e: 'draft', msg })
  return { ...s, drafts: { ...s.drafts, [msg.id]: 'pending' } }
}

function send(s: State, fx: Effect[]): State {
  const msg = current(s)
  const d = msg && s.drafts[msg.id]
  if (!msg || !d || typeof d === 'string') return s
  fx.push({ e: 'send', msg, text: d.text })
  return { ...s, view: 'sent', sendResult: undefined }
}

export function step(s: State, ev: Event): { s: State; fx: Effect[] } {
  const fx: Effect[] = []
  const msg = current(s)
  switch (ev.t) {
    case 'paired':
      return { s: { ...s, paired: true, view: 'empty' }, fx: [{ e: 'refresh' }] }
    case 'inbox': {
      const known = new Set([...s.queue.map(m => m.id), ...s.seen])
      const fresh = ev.msgs.filter(m => !known.has(m.id))
      if (!fresh.length) return { s, fx }
      // New messages go in after the one on screen, so the line never jumps away under the wearer.
      const queue = [...s.queue]
      const head = s.view === 'empty' || s.view === 'pair' ? 0 : s.at + 1
      queue.splice(head, 0, ...fresh.sort((a, b) => b.at - a.at))
      let n: State = { ...s, queue, at: s.view === 'empty' ? 0 : s.at }
      if (n.view === 'empty') n = { ...n, view: 'message' }
      return { s: prefetch(n, fx), fx }
    }
    case 'draft':
      return { s: { ...s, drafts: { ...s.drafts, [ev.id]: ev.draft ?? 'failed' }, view: s.view === 'thinking' && msg?.id === ev.id ? 'draft' : s.view }, fx }
    case 'tap':
      if (s.view === 'empty' || s.view === 'pair') return { s, fx: [{ e: 'refresh' }] }
      if (!msg) return { s, fx }
      if (s.view === 'message') {
        const d = s.drafts[msg.id]
        if (d === 'failed' || d === undefined) { fx.push({ e: 'draft', msg }); return { s: { ...s, view: 'thinking', drafts: { ...s.drafts, [msg.id]: 'pending' } }, fx } }
        return { s: { ...s, view: d === 'pending' ? 'thinking' : 'draft' }, fx }
      }
      if (s.view === 'draft') {
        const d = s.drafts[msg.id]
        if (typeof d !== 'object') { fx.push({ e: 'draft', msg }); return { s: { ...s, view: 'thinking', drafts: { ...s.drafts, [msg.id]: 'pending' } }, fx } }
        return { s: send(s, fx), fx }
      }
      if (s.view === 'listen') { fx.push({ e: 'mic', on: false }); return { s: { ...s, view: 'thinking' }, fx } }
      if (s.view === 'sent') return { s: advance(s, fx), fx }
      return { s, fx }
    case 'next':
      if (s.view === 'empty') { fx.push({ e: 'later', ms: 3500, ev: { t: 'note', text: '', was: (s.online ? '\u0000noMore' : '\u0000laterOnline') } }); return { s: { ...s, note: s.online ? '\u0000noMore' : '\u0000laterOnline' }, fx } }
      if (!msg || s.view === 'listen' || s.view === 'sent' || s.view === 'skipped') return { s, fx }
      fx.push({ e: 'later', ms: 2000, ev: { t: 'done', id: msg?.id } })
      return { s: { ...s, view: 'skipped' }, fx }  // swipe past a message or its reply: skipped, shown for a moment
    case 'prev':
      if (s.view === 'empty' && s.skippedMsgs?.length) {
        const back = s.skippedMsgs
        return { s: prefetch({ ...s, queue: back, at: 0, skippedMsgs: [], seen: s.seen.filter(id => !back.some(b => b.id === id)), view: 'message' }, fx), fx }
      }
      if (s.view === 'empty') { fx.push({ e: 'later', ms: 3500, ev: { t: 'note', text: '', was: '\u0000nothingEarlier' } }); return { s: { ...s, note: '\u0000nothingEarlier' }, fx } }
      if (!msg) return { s, fx }
      // Back from words being written goes where the hold began: the reply, if there was one.
      if (s.view === 'thinking' && s.heldFrom === 'draft' && typeof s.drafts[msg.id] === 'object') return { s: { ...s, view: 'draft', heldFrom: undefined }, fx }
      if (s.view === 'draft' || s.view === 'thinking') return { s: { ...s, view: 'message', heldFrom: undefined }, fx }
      if (s.view === 'message') { fx.push({ e: 'later', ms: 3500, ev: { t: 'note', text: '', was: '\u0000firstPart' } }); return { s: { ...s, note: '\u0000firstPart' }, fx } }
      return { s, fx }
    case 'hold':
      if (!msg || s.view === 'empty') { fx.push({ e: 'later', ms: 3500, ev: { t: 'note', text: '', was: '\u0000nothingToReply' } }); return { s: { ...s, note: '\u0000nothingToReply' }, fx } }
      if (s.view === 'sent' || s.view === 'skipped') return { s, fx }
      fx.push({ e: 'mic', on: true })
      return { s: { ...s, view: 'listen', heard: undefined, heldFrom: s.view === 'draft' ? 'draft' : 'message' }, fx }
    case 'release':
      if (s.view !== 'listen') return { s, fx }
      fx.push({ e: 'mic', on: false })
      return { s: { ...s, view: 'thinking', hearing: true }, fx }
    case 'heard': {
      // Words that arrive after the wearer cancelled are dropped.
      if (!msg || !s.hearing) return { s, fx }
      s = { ...s, hearing: false }
      const w = word(ev.text)
      if (w === 'send') return { s: send({ ...s, view: 'draft' }, fx), fx }
      if (w === 'skip') return { s: advance({ ...s, view: 'skipped' }, fx), fx }   // same as a swipe: still unread at the source
      if (w === 'back') return { s: { ...s, view: 'message' }, fx }
      if (!ev.text.trim()) {
        fx.push({ e: 'later', ms: 3500, ev: { t: 'note', text: '', was: '\u0000notHeard' } })
        return { s: { ...s, view: typeof s.drafts[msg.id] === 'object' ? 'draft' : 'message', note: '\u0000notHeard' }, fx }
      }
      fx.push({ e: 'draft', msg, ask: ev.text })
      return { s: { ...s, view: 'thinking', heard: ev.text, drafts: { ...s.drafts, [msg.id]: 'pending' } }, fx }
    }
    case 'sent':
      // Long enough to read; longer when the reply is waiting for the signal.
      fx.push({ e: 'later', ms: ev.queued ? 3500 : 2500, ev: { t: 'done', id: msg?.id } })
      return { s: { ...s, queued: ev.queued, sendResult: ev.queued ? 'saved' : 'sent' }, fx }
    case 'done':
      if (ev.id && current(s)?.id !== ev.id) return { s, fx }   // late, for another message
      return { s: s.view === 'sent' || s.view === 'skipped' ? advance(s, fx) : s, fx }
    case 'online': {
      // Back online on a reply that could not be written: write it now.
      const d = msg && s.drafts[msg.id]
      if (ev.online && !s.online && msg && s.view === 'draft' && d === 'failed') {
        fx.push({ e: 'draft', msg })
        return { s: { ...s, online: true, queued: ev.queued, view: 'thinking', drafts: { ...s.drafts, [msg.id]: 'pending' } }, fx }
      }
      return { s: { ...s, online: ev.online, queued: ev.queued }, fx }
    }
    case 'mute': {
      // Every message of a muted chat goes, from the screen and from the skipped list.
      const keep = (x: Msg) => `${x.source}:${x.chat}` !== ev.key
      const queue = s.queue.filter(keep)
      const at = Math.min(s.at, Math.max(0, queue.length - 1))
      const gone = [...s.queue, ...(s.skippedMsgs ?? [])].filter(x => !keep(x))
      const n = { ...s, queue, at, mutedMsgs: [...(s.mutedMsgs ?? []), ...gone], skippedMsgs: (s.skippedMsgs ?? []).filter(keep), seen: [...s.seen, ...s.queue.filter(x => !keep(x)).map(x => x.id)].slice(-500), view: (queue.length ? 'message' : 'empty') as View }
      return { s: prefetch(n, fx), fx }
    }
    case 'unmute': {
      // Muted messages come back next, right after the one on screen, as if they had just arrived.
      const back = (s.mutedMsgs ?? []).filter(x => !s.queue.some(q => q.id === x.id))
      if (!back.length) return { s: { ...s, mutedMsgs: [] }, fx }
      const queue = [...s.queue]
      const head = s.view === 'empty' || s.view === 'pair' ? 0 : s.at + 1
      queue.splice(head, 0, ...back)
      let n: State = { ...s, queue, at: s.view === 'empty' ? 0 : s.at, mutedMsgs: [], seen: s.seen.filter(id => !back.some(b => b.id === id)) }
      if (n.view === 'empty') n = { ...n, view: 'message' }
      return { s: prefetch(n, fx), fx }
    }
    case 'delivered':
      return { s: s.view === 'sent' && s.sendResult === 'saved' ? { ...s, sendResult: 'sent' } : s, fx }
    case 'checked':
      return { s: { ...s, checkedAt: ev.at }, fx }
    case 'note':
      if (ev.text) fx.push({ e: 'later', ms: ev.ms ?? 2500, ev: { t: 'note', text: '', was: ev.text } })
      if (!ev.text && ev.was !== undefined && s.note !== ev.was) return { s, fx }
      return { s: { ...s, note: ev.text || undefined }, fx }
    case 'cancel':
      // A double tap while saying a reply, or while it is being written down, goes back to where the hold began.
      if (s.view !== 'listen' && !(s.view === 'thinking' && s.hearing)) return { s, fx }
      if (s.view === 'listen') fx.push({ e: 'mic', on: false })
      fx.push({ e: 'later', ms: 3500, ev: { t: 'note', text: '', was: '\u0000cancelled' } })
      return { s: { ...s, view: s.heldFrom === 'draft' ? 'draft' : 'message', heldFrom: undefined, hearing: false, note: '\u0000cancelled' }, fx }
  }
}

// The card for the current view, in the wearer's language. Words are short on
// purpose: people read the first two words of a line (NN/g), and the wearer is mid-meeting.
export function card(s: State, lang = 'en'): Card {
  const c = cardOf(s, lang)
  const note = s.note === '\u0000notHeard' ? words(lang).notHeard : s.note === '\u0000nothingToReply' ? words(lang).nothingToReply : s.note === '\u0000noMore' ? words(lang).noMore : s.note === '\u0000laterOnline' ? words(lang).laterOnline : s.note === '\u0000firstPart' ? words(lang).firstPart : s.note === '\u0000nothingEarlier' ? words(lang).nothingEarlier : s.note === '\u0000cancelled' ? words(lang).cancelled : s.note
  // On a message, a note keeps the sender's name in front of it.
  const who = c.kind === 'message' ? current(s)?.from : undefined
  return note ? { ...c, hint: who ? `${who} · ${note}` : note } : c
}

function cardOf(s: State, lang: string): Card {
  const w = words(lang)
  const msg = current(s)
  const net = !s.online ? (s.queued ? `${w.noSignal} · ${w.waiting(s.queued)}` : w.noSignal) : ''
  switch (s.view) {
    case 'pair': return { kind: 'status', text: w.pair, hint: w.checkAgain }
    case 'empty': {
      const t = s.checkedAt ? ` · ${w.checkedTime(new Date(s.checkedAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }))}` : ''
      const back = (s.skippedMsgs?.length ? ` · ${w.showSkipped(s.skippedMsgs.length)}` : '') + (s.mutedMsgs?.length ? ` · ${w.mutedCount(s.mutedMsgs.length)}` : '')
      return { kind: 'status', text: net || (s.queued ? w.waiting(s.queued) : w.empty + t), hint: (s.online ? w.checkNow : w.tryAgain) + back }
    }
    case 'listen': return { kind: 'status', text: w.listening, hint: w.done }
    case 'thinking': return { kind: 'status', text: s.hearing ? w.hearing : s.heard ? `“${s.heard}”` : w.writing, hint: w.writingHint }
    case 'sent': return { kind: 'status', text: s.sendResult === 'sent' ? w.sent : s.sendResult === 'saved' ? w.saved : w.sending, hint: s.queue.length > 1 ? w.nextSoon : w.lastOne }
    case 'skipped': return { kind: 'status', text: w.skipped, hint: s.queue.length > 1 ? w.nextSoon : w.lastOne }
  }
  if (!msg) return { kind: 'status', text: w.empty, hint: w.checkNow }
  const progress: [number, number] = [s.at + 1, s.queue.length]
  if (s.view === 'draft') {
    const d = s.drafts[msg.id]
    if (typeof d !== 'object') return { kind: 'status', text: s.online ? w.noReply : `${w.noSignal} · ${w.noReply}`, hint: s.online ? w.speakReply : w.offlineHint }
    // A reply in a language the wearer does not read is shown by its meaning, with
    // the language named; the reply itself goes out in the sender's language.
    const x = d as Draft & { lang?: string; langName?: string }
    const name = langName(x.lang, lang) ?? x.langName
    // A reply written by the AI says so on the glasses (EU AI Act, Article 50).
    const ai = d.by === 'ai' ? 'AI draft · ' : ''
    if (d.gloss) return { kind: 'draft', head: name ? `↩ ${ai}${w.means(name, msg.from)}` : `↩ ${ai}`, text: d.gloss, hint: s.online ? w.draftHint : w.draftOffline, progress }
    return { kind: 'draft', head: name ? `↩ ${ai}${w.inLang(name, msg.from)}` : `↩ ${ai}`, text: d.text, hint: s.online ? w.draftHint : w.draftOffline, progress }
  }
  // A long message starts with one sentence saying what it wants, then the full text.
  const brief = (msg as Msg & { brief?: string }).brief
  const body = msg.translated ?? msg.text
  const left = s.queue.length - s.at - 1
  // The sender's name is in the hint row of every page, so the text gets the whole line.
  return { kind: 'message', text: brief ? `${w.inShort} ${brief}\n${body}` : body, hint: (net ? `${msg.from} · ${w.noSignal} · ${w.offlineHint}` : `${msg.from} · ${w.msgHint}`) + (left > 0 ? ` · ${w.more(left)}` : ''), progress }
}
