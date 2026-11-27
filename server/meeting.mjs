// The meeting card: 10 minutes before the next Google Calendar meeting, who and when, with "On my way."
// drafted, to send in the chat where that person last wrote to the wearer. Calendar is read only.
export const LEAD_MS = 10 * 60000

// The next meeting that starts within the lead time, with the first other attendee's name; null if none.
// get(url) returns the parsed JSON of a Google API call made with the wearer's token.
export async function nextMeeting(get, now = Date.now()) {
  const q = new URLSearchParams({ timeMin: new Date(now).toISOString(), timeMax: new Date(now + LEAD_MS + 30000).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '5' })
  const j = await get(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`)
  for (const e of j.items || []) {
    const at = Date.parse(e.start?.dateTime || '')
    if (!at || at < now) continue
    const other = (e.attendees || []).find(a => !a.self && !a.resource)
    const who = other ? (other.displayName || String(other.email || '').split('@')[0]) : ''
    if (who) return { id: e.id, title: e.summary || '', at, who }
  }
  return null
}

// The chat where this person last wrote, from the senders Gloz has seen: a first name or full name matches.
export function lastChatOf(who, seen) {
  const want = who.toLowerCase().trim(), first = want.split(/\s+/)[0]
  let best = null
  for (const [name, c] of seen) {
    const n = name.toLowerCase()
    if ((n === want || n.split(/\s+/)[0] === first) && (!best || c.at > best.at)) best = c
  }
  return best
}

// "15:00", in the server's clock, as the card shows it.
export const clock = at => { const d = new Date(at); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

// The card as a message: from the person, in the app they wrote from, with the reply drafted.
export function meetingMsg(ev, chat) {
  const app = chat.source[0].toUpperCase() + chat.source.slice(1)
  return {
    id: `meet:${ev.id}`, source: chat.source, chat: chat.chat, from: `${ev.who} · ${app}`,
    text: `${ev.title ? `${ev.title}, ` : ''}${clock(ev.at)}`, at: Date.now(), ref: chat.ref, meeting: true,
    pre: { text: 'On my way.', by: 'default' },
  }
}
