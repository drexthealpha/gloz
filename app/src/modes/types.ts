// An app inside Gloz on the glasses (teleprompter, reader, tasks, ...), opened from the glasses
// menu's "Apps" list. Messages stay the home screen; the menu's first item leads back to them.
import type { Card } from '../core/types.ts'
import type { Input } from '../glasses.ts'

export interface ModeCtx {
  // One call to this app's route on the Gloz server (POST /mode/<id>); null when not paired.
  call: (body: unknown) => Promise<any>
  lang: () => string                     // the wearer's language
  render: () => void                     // draw the card again
  mic: (on: boolean) => Promise<void>    // the glasses microphone, for apps that listen
  locate: () => Promise<{ lat: number; lon: number } | null>   // the phone's position, or null within 5 s
  store: { get: (k: string) => string | null; set: (k: string, v: string) => void }
}

export interface Mode {
  id: string
  card: () => Card
  // tap, next (swipe down), prev (swipe up), hold, release; exit never reaches an app.
  input: (i: Exclude<Input, 'exit'>) => void
  audio?: (pcm: Uint8Array) => void
  start?: () => void | Promise<void>
  stop?: () => void
}

export interface AppEntry {
  id: string
  title: (lang: string) => string        // short name in the Apps list
  make: (ctx: ModeCtx) => Mode
}
