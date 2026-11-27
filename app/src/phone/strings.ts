// Every phone-page string, with what it is for and its longest allowed length.
// English is the source language; the nine glasses languages load from app/public/lang when picked.
export const META = { lang: 'en', translated_by: 'source text, written in English', reviewed_by: 'source text, no translation to review' }

// Each entry: the text, then (in a comment) what it is for and its longest allowed length, for translators.
type S = { text: string }
const s = (text: string): S => ({ text })

export const STRINGS = {
  myLanguage: s('My language'), // Label: the language the wearer reads; replies are shown in it (max 24)
  saved: s('Saved ✓'), // Shown for a moment after a setting changes (max 12)
  pairTitle: s('Pair Gloz with your server'), // Heading of the pairing screen (max 40)
  onlyChats: s('Switch on chats to see only those. Muted chats stay hidden either way'), // Heading of the list of chats the wearer can pick (max 70)
  allChats: s('Every chat reaches the glasses'), // Chats row when none is picked or muted (max 40)
  onlyPicked: s('Only chats switched on reach the glasses'), // Chats row when some are picked (max 50)
  isMuted: s('muted'), // Mark after a muted chat in the list (max 12)
  chats: s('Chats'), // Button that opens the list of chats to pick or unmute (max 12)
  dataStays: s('Messages go only to your own server and the AI you choose. Your server keeps none after you reply.'), // Where message text goes, under the server field (max 110)
  pairStep: s('Type the 6-digit code your Gloz server shows.'), // The one instruction on the pairing screen (max 60)
  codeLabel: s('Pairing code'), // Accessible name of the code field (max 24)
  pair: s('Pair'), // Main button: pairs the glasses app with the server (max 16)
  sixDigits: s('Type all 6 digits.'), // Pair pressed before 6 digits are typed (max 30)
  noSound: s('No sound here'), // Listen pressed where sound cannot play (max 16)
  pairing: s('Pairing…'), // Main button while pairing runs (max 16)
  serverLabel: s('Server address'), // Label of the server address field (max 24)
  serverWhere: s('Your Gloz server shows its address and a code when it starts.'), // Where the server address comes from (max 70)
  badServer: s('Type the full web address, for example https://gloz.example.org'), // The server address is not a web address (max 70)
  back: s('Back'), // Back to the code step (max 12)
  next: s('Next'), // Button after typing the server address (max 16)
  server: s('Server'), // Recap of the server address on the code step (max 16)
  wrong: s('That code did not work. Check it and try again.'), // Error after a wrong code or no answer (max 70)
  offline: s('No connection. Check your signal, then press Pair again.'), // Error when the phone is offline (max 70)
  aiNotice: s('Written by speech recognition.'), // Says the transcript is machine-made (EU AI Act, Art. 50) (max 40)
  changeServer: s('Change server address'), // Next step offered after a pairing error (max 30)
  settingsTitle: s('Gloz settings'), // Heading of the settings screen (max 24)
  textSize: s('Text size on the glasses'), // Label of the text-size slider (max 32)
  sizeOf: s('{n} of 7'), // Text size value, for example 3 of 7 (max 12)
  more: s('More settings'), // Opens the rest of the settings (max 24)
  loading: s('Opening more settings…'), // Shown for a moment while More settings opens (max 32)
  translate: s('Translate messages into my language'), // Label of the translate switch (max 48)
  quiet: s('Quiet hours'), // Label of the quiet hours choice: new messages wait until it ends (max 24)
  quietOff: s('Off'), // Quiet hours choice: off (max 12)
  mark: s('Sign my replies "via Gloz"'), // Label of the switch that adds "via Gloz" under each sent reply (max 48)
  roomLang: s('In the room, people speak'), // Label: language spoken in Listen to the room (max 36)
  findIt: s('Detect it'), // Room language option: detect it (max 20)
  theme: s('Screen'), // Label of the theme choice (max 16)
  device: s('Like my phone'), // Theme option: follow the phone (max 20)
  light: s('Light'), // Theme option (max 12)
  dark: s('Dark'), // Theme option (max 12)
  mutedChats: s('{n} chats muted'), // How many chats are muted (max 20)
  mutedChat: s('1 chat muted'), // One chat is muted (max 20)
  unmute: s('Unmute all'), // Button: unmute every muted chat (max 16)
  unmuted: s('Unmuted ✓ Their messages are next on the glasses.'), // After Unmute all (max 60)
  lastTalk: s('Last conversation'), // Heading of the room transcript (max 28)
  copy: s('Copy'), // Copy the transcript (max 12)
  copied: s('Copied ✓'), // After copying (max 12)
  share: s('Share'), // Share the transcript (max 12)
  noCopy: s('Text selected: copy it from here'), // Copying is blocked; the text is selected instead (max 40)
  howTo: s('On the glasses'), // Heading of the gesture help (max 20)
  unpair: s('Unpair this phone'), // Button: this phone's pairing ends at once; pairing again needs a new code (max 24)
  fix: s('Fix my glasses'), // Button that opens the repair, replacement or refund request (max 16)
  fixWhat: s('What is wrong'), // Label of the problem list (max 24)
  fixDrops: s('Drops or will not connect'), // Problem: the connection (max 30)
  fixBattery: s('Battery or charging'), // Problem: power (max 30)
  fixBroken: s('Broken or damaged'), // Problem: hardware (max 30)
  fixFit: s('Lenses or fit'), // Problem: prescription lenses or fit (max 30)
  fixOrder: s('Order or delivery'), // Problem: an order not received (max 30)
  fixRefund: s('Return or refund'), // Problem: money back (max 30)
  fixApp: s('App or account'), // Problem: the Even app or sign-in (max 30)
  fixOrderNr: s('Order number'), // Label of the order number field (max 24)
  fixSerial: s('Serial number, if you have it'), // Label of the serial number field (max 32)
  fixSince: s('Since when'), // Label of the date the problem began (max 20)
  fixSend: s("Open Even Realities' support form"), // Button that opens the filled-in form (max 40)
  fixNote: s('The form opens filled in. Add your email there and press Submit.'), // Shown under the button (max 70)
  help1: s('Tap to see the reply. Tap again to send it.'), // Gesture help, line 1 (max 60)
  help2: s('Hold and say your reply.'), // Gesture help, line 2 (max 60)
  help3: s('Swipe down to skip a message.'), // Gesture help, line 3 (max 60)
  help4: s('Double tap to close Gloz.'), // Gesture help, line 4 (max 60)
  listen: s('Hear this'), // Plays the instruction beside it out loud (max 12)
  stop: s('Stop'), // Stops the instruction that is playing (max 12)
  noScript: s('Gloz needs JavaScript to run. Open it in the Even Realities app.'), // Shown when scripts are off (max 80)
  onGlasses: s('On the glasses:'), // Start of the status line, before the counts (max 24)
  toRead: s('{n} to read'), // Status count: messages still to read; {n} is a number (max 20)
  skipped: s('{n} skipped'), // Status count: messages skipped; {n} is a number (max 20)
  fromMuted: s('{n} from muted chats'), // Status count: messages held in muted chats; {n} is a number (max 30)
  waitingSignal: s('{n} waiting for signal'), // Status count: replies saved until the phone has signal; {n} is a number (max 32)
  noSignal: s('No signal'), // Status line when the phone has no connection (max 20)
} satisfies Record<string, S>

export type Key = keyof typeof STRINGS

// The status line on the settings screen: messages still to read on the glasses, skipped ones,
// ones from muted chats, and replies still waiting for the signal.
export function phoneStatus(toRead: number, skipped: number, muted: number, waiting: number) {
  return `${t('onGlasses')} ${[t('toRead', toRead), t('skipped', skipped), t('fromMuted', muted), ...(waiting ? [t('waitingSignal', waiting)] : [])].join(' · ')}`
}
// The wearer's language: English is built in; another loads only when picked (app/src/phone/lang/<code>.json),
// and Arabic, Persian and Hebrew turn the whole page to read from the other side. Translations: Claude (AI), not yet reviewed by native speakers.
let OVER: Record<string, string> = {}
let LANG = 'en'
const RTL = new Set(['ar', 'fa', 'he'])
export async function useLang(code: string): Promise<boolean> {
  if (!code || code === LANG) return false
  let next: Record<string, string> = {}
  // Plain data next to the page (app/public/lang), fetched only for the language picked.
  if (code !== 'en') { try { const r = await fetch(new URL(`lang/${code}.json`, document.baseURI)); if (!r.ok) throw 0; next = await r.json() } catch { next = {}; code = 'en' } }
  OVER = next; LANG = code
  if (typeof document !== 'undefined') { document.documentElement.lang = code; document.documentElement.dir = RTL.has(code) ? 'rtl' : 'ltr' }
  return true
}
export const t = (k: Key, n?: number) => (OVER[k] ?? STRINGS[k].text).replace('{n}', String(n ?? ''))
