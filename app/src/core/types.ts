export type Source = 'telegram' | 'slack' | 'discord' | 'gmail' | 'sample'

export interface Msg {
  id: string            // unique across sources, e.g. "telegram:123:456"
  source: Source
  chat: string          // chat, channel or thread name as the service shows it
  from: string          // sender name as the service shows it
  text: string
  at: number            // unix ms
  lang?: string         // detected language code of the text
  translated?: string   // text in the wearer's language, when translation is on
}

export interface Draft {
  text: string          // reply in the sender's language
  gloss?: string        // the same reply in the wearer's language, when they differ
  by: 'ai' | 'default'  // who wrote it: the AI model, or Gloz's fixed fallback
}

// One thing on the glasses. The display layer turns a card into lines.
export interface Card {
  kind: 'message' | 'draft' | 'status'
  head?: string         // short lead, e.g. the sender's name
  text: string
  hint?: string         // what a tap or hold does here
  progress?: [number, number]
  grid?: string[]       // short items drawn as a grid over the whole display (the dashboard)
}

export interface Settings {
  size: number          // 1 to 6
  low: boolean          // line sits low on the display
  translate: boolean
  myLang: string        // the wearer's language, e.g. "en"
  autoPace: boolean     // lines move on at reading pace
  roomLang?: string     // Listen to the room: the language spoken there; empty finds it
}

export const DEFAULT_SETTINGS: Settings = { size: 3, low: false, translate: false, myLang: 'en', autoPace: true }

// Font heights in pixels for sizes 1 to 6. Size 3 is the default.
export const SIZES = [28, 36, 48, 64, 84, 110]
