// Listen mode: captions of the conversation in the room, in the wearer's language.
// Pure: the shell feeds it audio results and presses; it says what to show.
import type { Card } from './types'
import { words } from './words.ts'

export interface Room {
  on: boolean
  paused: boolean
  lines: { text: string; at: number }[]   // finished captions, oldest first; never rewritten
  at: number                              // line on screen; -1 means "follow the newest"
  since?: number                          // first line of this listen: an earlier listen stays on the phone only
}

export const room = (): Room => ({ on: false, paused: false, lines: [], at: -1 })

export type RoomEvent = { t: 'start' } | { t: 'stop' } | { t: 'tap' } | { t: 'up' } | { t: 'down' } | { t: 'heard'; text: string; at: number }

export function roomStep(r: Room, ev: RoomEvent): Room {
  switch (ev.t) {
    case 'start': return { ...r, on: true, paused: false, at: -1, since: r.lines.length }
    case 'stop': return { ...r, on: false }
    case 'tap': return { ...r, paused: !r.paused }               // one tap pauses or goes on
    case 'up': {                                                 // any earlier line, not only 10 s back
      if (!r.lines.length) return r
      const cur = r.at < 0 ? r.lines.length - 1 : r.at
      return { ...r, at: Math.max(r.since ?? 0, cur - 1) }
    }
    case 'down': {
      if (r.at < 0) return r
      const n = r.at + 1
      return { ...r, at: n >= r.lines.length - 1 ? -1 : n }       // back at the newest: follow again
    }
    case 'heard':
      if (!r.on || r.paused || !ev.text.trim()) return r
      return { ...r, lines: [...r.lines, { text: ev.text.trim(), at: ev.at }] }
  }
}

export function roomCard(r: Room, lang = 'en'): Card {
  const w = words(lang)
  const shown = r.lines.length - (r.since ?? 0)
  const hint = (r.paused ? w.roomPausedHint : w.roomHint).replace(shown > 1 ? /$^/ : / · (up|swipe up): [^·]*?(?= ·|$)/, '')
  if (!shown) return { kind: 'status', text: r.paused ? w.roomPaused : w.roomListening, hint }
  const i = r.at < 0 ? r.lines.length - 1 : r.at
  return { kind: 'status', head: r.paused ? '❚❚' : undefined, text: r.lines[i].text, hint, progress: [i + 1 - (r.since ?? 0), shown] }
}

// The transcript for the phone screen: copy, share, keep.
// What a swipe past either end of the captions says: paused stays "Paused", so it never reads as listening.
export function edgeNote(r: Room, dir: 'next' | 'prev', lang = 'en'): string {
  const w = words(lang)
  if (dir === 'prev') return w.nothingEarlier
  if (r.paused) return w.roomPaused
  return r.lines.length - (r.since ?? 0) === 0 ? w.nothingHeardYet : w.latestLine
}

export function transcript(r: Room): string {
  return r.lines.map(l => `${new Date(l.at).toTimeString().slice(0, 5)}  ${l.text}`).join('\n')
}
