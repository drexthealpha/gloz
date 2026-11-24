// Every phone-page string, with what it is for and its longest allowed length.
// English is the source language; no other phone-page language ships yet.
export const META = { lang: 'en', translated_by: 'source text, written in English', reviewed_by: 'source text, no translation to review' }

type S = { text: string; description: string; max_length: number }
const s = (text: string, description: string, max_length: number): S => ({ text, description, max_length })

export const STRINGS = {
  myLanguage: s('My language', 'Label: the language the wearer reads; replies are shown in it', 24),
  saved: s('Saved ✓', 'Shown for a moment after a setting changes', 12),
  pairTitle: s('Pair Gloz with your server', 'Heading of the pairing screen', 40),
  onlyChats: s('Turn on a chat and only the chats turned on reach the glasses', 'Heading of the list of chats the wearer can pick', 70),
  allChats: s('Every chat reaches the glasses', 'Chats row when none is picked or muted', 40),
  onlyPicked: s('Only the chats you picked reach the glasses', 'Chats row when some are picked', 50),
  chats: s('Chats', 'Button that opens the list of chats to pick or unmute', 12),
  dataStays: s('Messages go only to your own server and the AI you choose. Your server keeps none after you reply.', 'Where message text goes, under the server field', 110),
  pairStep: s('Type the 6-digit code your Gloz server shows.', 'The one instruction on the pairing screen', 60),
  codeLabel: s('Pairing code', 'Accessible name of the code field', 24),
  pair: s('Pair', 'Main button: pairs the glasses app with the server', 16),
  sixDigits: s('Type all 6 digits.', 'Pair pressed before 6 digits are typed', 30),
  noSound: s('No sound here', 'Listen pressed where sound cannot play', 16),
  pairing: s('Pairing…', 'Main button while pairing runs', 16),
  serverLabel: s('Server address', 'Label of the server address field', 24),
  serverWhere: s('Your Gloz server shows its address and a code when it starts.', 'Where the server address comes from', 70),
  badServer: s('Type the full web address, for example https://gloz.example.org', 'The server address is not a web address', 70),
  back: s('Back', 'Back to the code step', 12),
  next: s('Next', 'Button after typing the server address', 16),
  server: s('Server', 'Recap of the server address on the code step', 16),
  wrong: s('That code did not work. Check it and try again.', 'Error after a wrong code or no answer', 70),
  offline: s('No connection. Check your signal, then press Pair again.', 'Error when the phone is offline', 70),
  aiNotice: s('Written by speech recognition.', 'Says the transcript is machine-made (EU AI Act, Art. 50)', 40),
  changeServer: s('Change server address', 'Next step offered after a pairing error', 30),
  settingsTitle: s('Gloz settings', 'Heading of the settings screen', 24),
  textSize: s('Text size on the glasses', 'Label of the text-size slider', 32),
  sizeOf: s('{n} of 6', 'Text size value, for example 3 of 6', 12),
  more: s('More settings', 'Opens the rest of the settings', 24),
  loading: s('Opening more settings…', 'Shown for a moment while More settings opens', 32),
  line: s('Text position on the glasses', 'Label: where the line of text sits on the glasses', 32),
  middle: s('Middle', 'Line position: middle', 12),
  low: s('Low', 'Line position: low', 12),
  translate: s('Translate messages into my language', 'Label of the translate switch', 48),
  roomLang: s('In the room, people speak', 'Label: language spoken in Listen to the room', 36),
  findIt: s('Detect it', 'Room language option: detect it', 20),
  theme: s('Screen', 'Label of the theme choice', 16),
  device: s('Like my phone', 'Theme option: follow the phone', 20),
  light: s('Light', 'Theme option', 12),
  dark: s('Dark', 'Theme option', 12),
  mutedChats: s('{n} muted chats', 'How many chats are muted', 20),
  mutedChat: s('1 muted chat', 'One chat is muted', 20),
  unmute: s('Unmute all', 'Button: unmute every muted chat', 16),
  unmuted: s('Unmuted ✓ Their messages are next on the glasses.', 'After Unmute all', 60),
  lastTalk: s('Last conversation', 'Heading of the room transcript', 28),
  copy: s('Copy', 'Copy the transcript', 12),
  copied: s('Copied ✓', 'After copying', 12),
  share: s('Share', 'Share the transcript', 12),
  noCopy: s('Text selected: copy it from here', 'Copying is blocked; the text is selected instead', 40),
  howTo: s('On the glasses', 'Heading of the gesture help', 20),
  help1: s('Tap to see the reply. Tap again to send it.', 'Gesture help, line 1', 60),
  help2: s('Hold and say your own words for the reply.', 'Gesture help, line 2', 60),
  help3: s('Swipe down to skip. Up at the end brings them back.', 'Gesture help, line 3', 60),
  help4: s('Double tap to close Gloz.', 'Gesture help, line 4', 60),
  listen: s('Listen', 'Plays the instruction beside it out loud', 12),
  stop: s('Stop', 'Stops the instruction that is playing', 12),
  noScript: s('Gloz needs JavaScript to run. Open it in the Even Realities app.', 'Shown when scripts are off', 80),
} satisfies Record<string, S>

export type Key = keyof typeof STRINGS

// The status line on the settings screen: messages still to read on the glasses, skipped ones,
// ones from muted chats, and replies still waiting for the signal.
export function phoneStatus(toRead: number, skipped: number, muted: number, waiting: number) {
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
  return `On the glasses: ${[`${toRead} to read`, `${skipped} skipped`, `${muted} from muted chats`, ...(waiting ? [n(waiting, 'reply waiting for signal', 'replies waiting for signal')] : [])].join(' · ')}`
}
export const t = (k: Key, n?: number) => STRINGS[k].text.replace('{n}', String(n ?? ''))
