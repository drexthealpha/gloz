// Every phone-page string, with what it is for and its longest allowed length.
// English is the source language; no other phone-page language ships yet.
export const META = { lang: 'en', translated_by: 'source text, written in English', reviewed_by: 'source text, no translation to review' }

// Each entry: the text, then (in a comment) what it is for and its longest allowed length, for translators.
type S = { text: string }
const s = (text: string): S => ({ text })

export const STRINGS = {
  myLanguage: s('My language'), // Label: the language the wearer reads; replies are shown in it (max 24)
  saved: s('Saved ✓'), // Shown for a moment after a setting changes (max 12)
  pairTitle: s('Pair Gloz with your server'), // Heading of the pairing screen (max 40)
  onlyChats: s('On: only these reach the glasses. All off: every chat does'), // Heading of the list of chats the wearer can pick (max 70)
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
  line: s('Text position on the glasses'), // Label: where the line of text sits on the glasses (max 32)
  middle: s('Middle'), // Line position: middle (max 12)
  low: s('Low'), // Line position: low (max 12)
  translate: s('Translate messages into my language'), // Label of the translate switch (max 48)
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
  help1: s('Tap to see the reply. Tap again to send it.'), // Gesture help, line 1 (max 60)
  help2: s('Hold and say your own words for the reply.'), // Gesture help, line 2 (max 60)
  help3: s('Swipe down to skip. Up at the end brings them back.'), // Gesture help, line 3 (max 60)
  help4: s('Double tap to close Gloz.'), // Gesture help, line 4 (max 60)
  listen: s('Hear this'), // Plays the instruction beside it out loud (max 12)
  stop: s('Stop'), // Stops the instruction that is playing (max 12)
  noScript: s('Gloz needs JavaScript to run. Open it in the Even Realities app.'), // Shown when scripts are off (max 80)
} satisfies Record<string, S>

export type Key = keyof typeof STRINGS

// The status line on the settings screen: messages still to read on the glasses, skipped ones,
// ones from muted chats, and replies still waiting for the signal.
export function phoneStatus(toRead: number, skipped: number, muted: number, waiting: number) {
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
  return `On the glasses: ${[`${toRead} to read`, `${skipped} skipped`, `${muted} from muted chats`, ...(waiting ? [n(waiting, 'reply waiting for signal', 'replies waiting for signal')] : [])].join(' · ')}`
}
export const t = (k: Key, n?: number) => STRINGS[k].text.replace('{n}', String(n ?? ''))
