import { test } from 'node:test'
import assert from 'node:assert/strict'
import { start, step, card, word, isDraft, type State, type Event } from '../app/src/core/flow.ts'
import { Outbox } from '../app/src/core/outbox.ts'
import { wrap, direction, dwell } from '../app/src/core/layout.ts'
import type { Msg } from '../app/src/core/types.ts'

const m = (id: string, text = 'Can we move the call to 3?', at = 1): Msg => ({ id, source: 'telegram', chat: 'Board', from: 'Ana', text, at })

function run(s: State, ...evs: Event[]) {
  const all: any[] = []
  for (const ev of evs) { const r = step(s, ev); s = r.s; all.push(...r.fx) }
  return { s, fx: all }
}

test('a new message shows at once and its draft is asked for before any press', () => {
  const { s, fx } = run(start(true), { t: 'inbox', msgs: [m('a')] })
  assert.equal(s.view, 'message')
  assert.match(card(s).hint!, /^Ana · /)
  assert.deepEqual(fx.map(f => f.e), ['draft'])
})

test('the reply arrives with the message and one tap sends it; nothing is sent before the tap', () => {
  let { s } = run(start(true), { t: 'inbox', msgs: [m('a')] })
  // The message is on the lens while its reply is written; nothing to press yet.
  assert.equal(s.view, 'message')
  const r0 = run(s, { t: 'draft', id: 'a', draft: { text: 'Yes, 3 works.', by: 'ai' } })
  assert.equal(r0.s.view, 'draft')
  assert.equal(r0.fx.length, 0)
  // One card: who, one line of what they wrote, and the reply.
  assert.equal(card(r0.s).head, '↩ AI draft · Ana: Can we move the call to 3?')
  assert.match(card(r0.s).text, /Yes, 3 works/)
  const r = run(r0.s, { t: 'tap' })
  assert.deepEqual(r.fx.map(f => f.e), ['send'])
  assert.equal(r.fx[0].text, 'Yes, 3 works.')
})

test('double tap on a reply shows the next of three, wraps round, and tap sends the one on screen; a swipe skips', () => {
  const alts = [{ text: 'Yes, 3 works.' }, { text: 'Not today, tomorrow?' }, { text: 'Which 3, am or pm?' }]
  let { s } = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'draft', id: 'a', draft: { text: alts[0].text, by: 'ai', alts } })
  assert.match(card(s).head!, /^↩ AI draft 1\/3 · Ana: /)
  assert.equal(card(s).hint, 'tap: send · double tap: another · down: skip')
  s = run(s, { t: 'alt' }).s
  assert.equal(s.view, 'draft')
  assert.match(card(s).text, /Not today/)
  assert.match(card(s).head!, /2\/3/)
  s = run(s, { t: 'alt' }, { t: 'alt' }).s
  assert.match(card(s).text, /Yes, 3 works/)
  const sent = run(s, { t: 'alt' }, { t: 'tap' }).fx.find(f => f.e === 'send')
  assert.equal(sent.text, 'Not today, tomorrow?')
  // A swipe on a reply skips the message, alternatives or not.
  assert.equal(run(s, { t: 'next' }).s.view, 'skipped')
  // A reply with no alternatives: double tap does nothing here (the app closes Gloz instead).
  const one = run(start(true), { t: 'inbox', msgs: [m('b')] }, { t: 'draft', id: 'b', draft: { text: 'OK', by: 'ai' } }, { t: 'alt' }).s
  assert.equal(card(one).text, 'OK')
})

test('a message shown in translation says an AI translated it, beside the sender', () => {
  const t = run(start(true), { t: 'inbox', msgs: [{ ...m('a', 'Можем в три?'), translated: 'Can we do three?' }] }).s
  assert.match(card(t).hint!, /^Ana · AI translation · /)
  assert.equal(card(t).text, 'Can we do three?')
  assert.match(card(run(start(true), { t: 'inbox', msgs: [m('b')] }).s).hint!, /^Ana · tap/)
})

test('up on the start of a message says so in words true for a message of any length', () => {
  const s = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'prev' }).s
  assert.equal(card(s).hint, 'Ana · Start of this message')
})

test('pairing clears the sample messages shown before it, so none shows twice', () => {
  const before = run(start(true), { t: 'inbox', msgs: [m('s1'), m('s2')] }).s
  const after = run(before, { t: 'paired' }).s
  assert.equal(after.queue.length, 0)
  assert.equal(run(after, { t: 'inbox', msgs: [m('real1')] }).s.queue.length, 1)
})

test('a tap before the draft arrives waits, then shows the draft', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'tap' })
  assert.equal(r.s.view, 'thinking')
  r = run(r.s, { t: 'draft', id: 'a', draft: { text: 'OK', by: 'ai' } })
  assert.equal(r.s.view, 'draft')
})

test('spoken words other than one command make a new draft, never a send', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'draft', id: 'a', draft: { text: 'OK', by: 'ai' } }, { t: 'hold' })
  assert.equal(r.s.view, 'listen')
  r = run(r.s, { t: 'release' }, { t: 'heard', text: 'tell her 4 is better' })
  assert.deepEqual(r.fx.map(f => f.e), ['mic', 'draft'])
  assert.equal(r.fx[1].ask, 'tell her 4 is better')
  assert.equal(r.fx.some(f => f.e === 'send'), false)
})

test('the one word "send" sends, in ten languages', () => {
  for (const w of ['send', 'Send.', 'أرسل', 'بفرست', 'भेजो', 'ส่ง', 'שלח', '送信', '보내', '发送', 'Отправь']) assert.equal(word(w), 'send', w)
  // Skip, in every language whose listening line names it.
  for (const w of ['skip', 'تخطى', 'بعدی', 'דלג', 'छोड़ो', 'ข้าม', 'スキップ', '넘겨', '跳过', 'Дальше']) assert.equal(word(w), 'skip', w)
  assert.equal(word('send it to Bob tomorrow'), null)
})

test('new messages never push the one on screen away', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 1)] }, { t: 'inbox', msgs: [m('b', 'y', 2)] })
  assert.equal(r.s.queue[r.s.at].id, 'a')
  assert.equal(r.s.queue.length, 2)
})

test('after "Sent" the next message comes up and the first is marked read', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2), m('b', 'y', 1)] }, { t: 'draft', id: 'a', draft: { text: 'OK', by: 'ai' } }, { t: 'tap' }, { t: 'sent', queued: 0 }, { t: 'done' })
  assert.equal(r.s.view, 'message')
  assert.equal(r.s.queue[r.s.at].id, 'b')
  assert.ok(r.fx.some(f => f.e === 'read' && f.msg.id === 'a'))
})

test('offline: the line says the reply is saved and waiting', () => {
  let r = run(start(true), { t: 'online', online: false, queued: 1 })
  assert.equal(card(r.s).text, 'No signal · 1 reply waiting')
})

test('unpaired glasses say what to do, never a blank screen', () => {
  assert.match(card(start(false)).text, /phone to pair/)
})

const mem = () => { const d: Record<string, string> = {}; return { get: (k: string) => d[k] ?? null, set: (k: string, v: string) => { d[k] = v }, d } }

test('undo: a reply is held 5 s and can be taken back; after the hold it goes, even after a restart', async () => {
  let t = 0
  const sent: string[] = []
  const store = mem()
  const ob = new Outbox(store, async p => { sent.push(p.text); return 'ok' }, () => t)
  ob.add('a', 'Yes', 5000)
  assert.equal(await ob.flush(), 0, 'held during the undo window')
  ob.retryNow()   // the link coming back does not cut the hold short
  assert.equal(await ob.flush(), 0)
  assert.equal(ob.cancel('a'), true)
  assert.equal(ob.size, 0)
  ob.add('b', 'No', 5000)
  const again = new Outbox(store, async p => { sent.push(p.text); return 'ok' }, () => t)   // the app closed in the window
  t = 5001
  assert.equal(again.cancel('b'), false, 'too late to undo')
  assert.equal(await again.flush(), 1)
  assert.deepEqual(sent, ['No'])
  // In the flow: up on "Sending…" takes the reply back to the screen; down moves on while it goes.
  let s = run(start(true), { t: 'inbox', msgs: [m('x'), m('y')] }, { t: 'draft', id: 'x', draft: { text: 'Sure', by: 'ai' } }, { t: 'tap' }).s
  assert.equal(s.view, 'sent')
  assert.match(card(s).hint!, /^up: undo/)
  const u = run(s, { t: 'prev' })
  assert.equal(u.s.view, 'draft')
  assert.deepEqual(u.fx.map(f => f.e), ['undo', 'later'])   // the later clears the "Not sent" note
  assert.equal(run(s, { t: 'next' }).s.queue[run(s, { t: 'next' }).s.at]?.id, 'y')
})

test('outbox keeps a reply through a drop and sends it once the link is back', async () => {
  let t = 0
  let up = false
  const sent: string[] = []
  const store = mem()
  const ob = new Outbox(store, async p => { if (!up) return 'retry'; sent.push(p.key); return 'ok' }, () => t)
  ob.add('a', 'Yes')
  assert.equal(await ob.flush(), 0)
  assert.equal(ob.size, 1)
  // The app is closed and opened again: the reply is still there.
  const again = new Outbox(store, async p => { sent.push(p.key); return 'ok' }, () => t)
  assert.equal(again.size, 1)
  up = true
  t = 1000
  assert.equal(await again.flush(), 0, 'waits for its retry time')
  t = 2001
  assert.equal(await again.flush(), 1)
  assert.equal(again.size, 0)
  assert.equal(sent.length, 1)
})

test('wrap fits lines to the width and keeps every character', () => {
  const measure = (s: string) => [...s].length * 10
  const text = 'Can we move the board call to three, or is four better for you?'
  const lines = wrap(text, 200, measure)
  for (const l of lines) assert.ok(measure(l) <= 200, l)
  assert.equal(lines.join(' '), text)
  const th = 'สิ่งที่คุณสงสัยเป็นความจริง'
  assert.equal(wrap(th, 80, measure).join(''), th)
  const ja = '有能な大蔵大臣の創意になる処置は、行き詰まった国の財政から赤字をなくすのに役立った。'
  assert.equal(wrap(ja, 120, measure).join(''), ja)
})

test('direction finds right-to-left scripts', () => {
  assert.equal(direction('من أين أتيت؟'), 'rtl')
  assert.equal(direction('שלום'), 'rtl')
  assert.equal(direction('12 Hello'), 'ltr')
})

test('lines stay up long enough to read', () => {
  assert.ok(dwell('Yes') >= 1.5)
  assert.ok(dwell('有能な大蔵大臣の創意になる処置は') > dwell('Can we move the call?'))
})

test('a reply in another language shows its meaning in the wearer language, and sends the original', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'هل يمكننا؟')] }, { t: 'draft', id: 'a', draft: { text: 'نعم', gloss: 'Yes', by: 'ai', langName: 'Arabic' } as any })
  assert.equal(card(r.s).head, '↩ AI draft · Ana: هل يمكننا؟')
  assert.equal(card(r.s).text, 'Yes')
  assert.match(card(r.s).hint!, /^Arabic: tap: send/)
  r = run(r.s, { t: 'tap' })
  assert.equal(r.fx[0].text, 'نعم')
})

test('a message answered or skipped never comes back, even if the backend sends it again', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2), m('b', 'y', 1)] }, { t: 'next' })
  assert.match(card(r.s).text, /^Skipped/)
  r = run(r.s, { t: 'done' })
  assert.equal(r.s.queue[r.s.at].id, 'b')
  r = run(r.s, { t: 'inbox', msgs: [m('a', 'x', 2)] })
  assert.equal(r.s.queue.filter(q => q.id === 'a').length, 0)
})

test('the glasses speak the wearer language: every word on every screen, in ten languages', async () => {
  const { words } = await import('../app/src/core/words.ts')
  const screens = [start(false), start(true), run(start(true), { t: 'online', online: false, queued: 2 }).s]
  for (const l of ['en', 'ar', 'fa', 'he', 'hi', 'th', 'ja', 'ko', 'zh', 'ru']) {
    for (const s of screens) { const c = card(s, l); assert.ok(c.text && c.hint, l) }
    assert.equal(card(start(true), l).text, words(l).empty)
  }
  assert.equal(card(start(true), 'ar').text, 'لا رسائل جديدة')
})

test('a long message starts with one sentence saying what it wants', () => {
  const long = { ...m('a', 'x'.repeat(400)), brief: 'Priya needs your sign-off on the contract by Friday.' } as any
  const r = run(start(true), { t: 'inbox', msgs: [long] })
  assert.match(card(r.s).text, /^In short: Priya needs your sign-off/)
  assert.match(card(r.s, 'ja').text, /^要点:/)
})

import { room, roomStep, roomCard, transcript, edgeNote } from '../app/src/core/room.ts'

test('listen: captions are added, never rewritten; one tap pauses; swipe reaches any earlier line', () => {
  let r = roomStep(room(), { t: 'start' })
  assert.match(roomCard(r).text, /Listening/)
  r = roomStep(r, { t: 'heard', text: 'We can ship on Friday.', at: 1 })
  r = roomStep(r, { t: 'heard', text: 'The price stays the same.', at: 2 })
  r = roomStep(r, { t: 'heard', text: 'Legal needs one more day.', at: 3 })
  assert.equal(roomCard(r).text, 'Legal needs one more day.')
  r = roomStep(r, { t: 'tap' })
  assert.equal(r.paused, true)
  r = roomStep(r, { t: 'heard', text: 'not kept while paused', at: 4 })
  assert.equal(r.lines.length, 3)
  r = roomStep(roomStep(r, { t: 'up' }), { t: 'up' })
  assert.equal(roomCard(r).text, 'We can ship on Friday.')
  r = roomStep(roomStep(r, { t: 'down' }), { t: 'down' })
  assert.equal(r.at, -1)
  assert.deepEqual(r.lines.map(l => l.text), ['We can ship on Friday.', 'The price stays the same.', 'Legal needs one more day.'])
  assert.equal(transcript(r).split('\n').length, 3)
  assert.match(roomCard(r, 'ar').hint!, /انقر/)
})

test('a full stop or comma never starts a line', () => {
  const measure = (s: string) => [...s].length * 10
  for (const w of [60, 70, 80, 90, 100]) {
    for (const line of wrap('Got it. I will reply properly soon.', w, measure)) assert.doesNotMatch(line, /^[.,!?]/, `width ${w}: ${line}`)
  }
})

test('menu names fit the 32-byte limit in every language', async () => {
  const { menuItems } = await import('../app/src/core/menu.ts')
  for (const l of ['en', 'ar', 'fa', 'he', 'hi', 'th', 'ja', 'ko', 'zh', 'ru']) {
    const items = menuItems(l)
    assert.equal(items.length, 8)   // no Apps item: every tool is reached from home
    assert.ok(items.length <= 10, 'the glasses menu holds at most 10 items')
    const inApp = menuItems(l, false, 'Stop listening', true)
    assert.equal(inApp[0].itemID, 10)
    for (const it of [...items, ...inApp]) assert.ok(Buffer.byteLength(it.itemName) <= 32, `${l}: ${it.itemName} is ${Buffer.byteLength(it.itemName)} bytes`)
  }
})

test('a skipped message stays unread at the service; an answered one is marked read', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2), m('b', 'y', 1)] }, { t: 'next' }, { t: 'done' })
  assert.ok(r.fx.some(f => f.e === 'seen' && f.msg.id === 'a'))
  assert.ok(!r.fx.some(f => f.e === 'read'))
  assert.match(card(r.s, 'en').text, /^b|y/)
})

test('saying "skip" is the same as a swipe: the message stays unread and can come back', () => {
  const r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2), m('b', 'y', 1)] }, { t: 'hold' }, { t: 'release' }, { t: 'heard', text: 'skip' })
  assert.ok(r.fx.some(f => f.e === 'seen' && f.msg.id === 'a'))
  assert.ok(!r.fx.some(f => f.e === 'read'))
  assert.deepEqual(r.s.skippedMsgs?.map(x => x.id), ['a'])
})

test('the glasses say how many messages are left, and when nothing was heard', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 3), m('b', 'y', 2), m('c', 'z', 1)] })
  assert.match(card(r.s).hint!, /2 more$/)
  r = run(r.s, { t: 'hold' }, { t: 'release' }, { t: 'heard', text: '' })
  assert.match(card(r.s).hint!, /Didn’t catch that$/)
  assert.ok(r.fx.some(f => f.e === 'later' && f.ev.t === 'note'))
})

test('skipped messages can be brought back from the empty screen', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 1)] }, { t: 'next' }, { t: 'done' })
  assert.equal(r.s.view, 'empty')
  assert.match(card(r.s).hint!, /up: skipped \(1\)/)
  r = run(r.s, { t: 'prev' })
  assert.equal(r.s.view, 'message')
  assert.equal(r.s.queue[r.s.at].id, 'a')
})

test('listen hint offers "earlier" only when there is an earlier line', () => {
  let r = roomStep(room(), { t: 'start' })
  assert.equal(roomCard(r).hint, 'tap: pause · menu: Stop listening')
  r = roomStep(roomStep(r, { t: 'heard', text: 'a', at: 1 }), { t: 'heard', text: 'b', at: 2 })
  assert.match(roomCard(r).hint!, /up: earlier/)
})

test('the send screen says Sending until the outbox answers, then Sent or Saved', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2), m('b', 'y', 1)] }, { t: 'draft', id: 'a', draft: { text: 'OK', by: 'ai' } }, { t: 'tap' })
  assert.equal(card(r.s).text, 'Sending…')
  assert.equal(card(run(r.s, { t: 'sent', queued: 0 }).s).text, 'Sent ✓')
  assert.match(card(run(r.s, { t: 'sent', queued: 1 }).s).text, /^Saved/)
})

test('a reply that could not be written is written when the signal comes back', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 1)] }, { t: 'tap' }, { t: 'online', online: false, queued: 0 }, { t: 'draft', id: 'a', draft: null })
  assert.equal(r.s.view, 'draft')
  r = run(r.s, { t: 'online', online: true, queued: 0 })
  assert.ok(r.fx.some(f => f.e === 'draft'))
  assert.equal(r.s.view, 'thinking')
})

test('muting a chat removes all of its messages, skipped ones too', () => {
  const other = { ...m('c', 'z', 0), chat: 'Other' }
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 3), m('b', 'y', 2), other] }, { t: 'next' }, { t: 'done' })
  assert.equal(r.s.skippedMsgs?.length, 1)
  r = run(r.s, { t: 'mute', key: 'telegram:Board' })
  assert.deepEqual(r.s.queue.map(q => q.id), ['c'])
  assert.equal(r.s.skippedMsgs?.length, 0)
})

test('unmuting puts a muted chat\'s messages next, after the one on screen', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2), { ...m('c', 'z', 1), chat: 'Other' }] }, { t: 'mute', key: 'telegram:Board' })
  assert.equal(r.s.queue.length, 1)
  r = run(r.s, { t: 'unmute' })
  assert.deepEqual(r.s.queue.map(x => x.id), ['c', 'a'])
  assert.equal(r.s.at, 0)
  assert.ok(!r.s.seen.includes('a'))
  // From the empty screen they show at once.
  r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2)] }, { t: 'mute', key: 'telegram:Board' })
  assert.equal(r.s.view, 'empty')
  r = run(r.s, { t: 'unmute' })
  assert.equal(r.s.view, 'message')
  assert.match(card(r.s, 'en').text, /x/)
})

test('a late "done" from an earlier skip never moves a different message', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 3), m('b', 'y', 2), m('c', 'z', 1)] }, { t: 'next' })
  const late = r.fx.find(f => f.e === 'later')!.ev
  r = run(r.s, late, { t: 'next' })       // a skipped, b now on screen and skipped too
  r = run(r.s, late)                      // the old "done" for a arrives again
  assert.equal(r.s.view, 'skipped')
  assert.equal(r.s.queue[r.s.at].id, 'b')
})

test('with no signal, the holding reply is written on the phone in the sender language', async () => {
  const { holdingReply } = await import('../app/src/core/holding.ts')
  const d = holdingReply('ลูกค้าขอเลื่อนการประชุม', 'en')
  assert.equal(d.lang, 'th')
  assert.match(d.text, /ได้รับแล้ว/)
  assert.match(d.gloss!, /Got it/)
})

test('a second listen starts fresh on the glasses; the first stays in the transcript', () => {
  let r = roomStep(room(), { t: 'start' })
  r = roomStep(r, { t: 'heard', text: 'First talk.', at: 1 })
  r = roomStep(roomStep(r, { t: 'stop' }), { t: 'start' })
  assert.match(roomCard(r).text, /Listening/)
  r = roomStep(r, { t: 'heard', text: 'Second talk.', at: 2 })
  assert.equal(roomCard(r).text, 'Second talk.')
  assert.equal(roomCard(r).head, undefined)
  r = roomStep(r, { t: 'up' })
  assert.equal(roomCard(r).text, 'Second talk.')
  assert.match(transcript(r), /First talk\.[\s\S]*Second talk\./)
})

test('cancelling spoken words on a reply goes back to that reply', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2)] }, { t: 'draft', id: 'a', draft: { text: 'ok', by: 'default' } })
  assert.equal(r.s.view, 'draft')
  r = run(r.s, { t: 'hold' }, { t: 'release' }, { t: 'prev' })
  assert.equal(r.s.view, 'draft')
  r = run(r.s, { t: 'prev' })
  assert.equal(r.s.view, 'message')
})

test('a hold and release on a reply never sends it', () => {
  let r = run(start(true), { t: 'inbox', msgs: [m('a', 'x', 2)] }, { t: 'draft', id: 'a', draft: { text: 'ok', by: 'default' } })
  r = run(r.s, { t: 'hold' }, { t: 'release' })
  assert.ok(!r.fx.some(f => f.e === 'send'))
  r = run(r.s, { t: 'heard', text: '' })
  assert.ok(!r.fx.some(f => f.e === 'send'))
  assert.equal(r.s.view, 'draft')
})

test('only a reply the AI wrote is labelled as an AI draft', () => {
  const fixed = run(start(true), { t: 'inbox', msgs: [m('a', 'Hi')] }, { t: 'draft', id: 'a', draft: { text: 'Got it', by: 'default', langName: 'English' } as any })
  assert.ok(!String(card(fixed.s).head).includes('AI'))
})

test('a note stays its full time: an older note\'s clear never removes a newer note', () => {
  let { s, fx } = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'note', text: 'First' })
  const oldClear = fx.find(f => f.e === 'later')!.ev
  s = run(s, { t: 'note', text: 'Muted Ana' }).s
  s = run(s, oldClear).s
  assert.match(card(s).hint!, /Muted Ana$/)
  s = run(s, { t: 'note', text: '', was: 'Muted Ana' }).s
  assert.doesNotMatch(card(s).hint!, /Muted Ana/)
})

test('a double tap while saying a reply cancels it and goes back to the message', () => {
  let { s, fx } = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'hold' })
  assert.equal(s.view, 'listen')
  assert.match(card(s).hint!, /double tap: cancel/)
  const r = run(s, { t: 'cancel' })
  assert.equal(r.s.view, 'message')
  assert.deepEqual(r.fx[0], { e: 'mic', on: false })
  assert.match(card(r.s).hint!, /Cancelled$/)
  // Let go first, then a double tap: the words being written down are dropped when they come.
  let w = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'hold' }, { t: 'release' }, { t: 'cancel' }).s
  assert.equal(w.view, 'message')
  w = run(w, { t: 'heard', text: 'too late' }).s
  assert.equal(w.view, 'message')
  assert.match(card(w).hint!, /Cancelled$/)
})

test('a time is never broken at its colon when a line wraps', () => {
  const measure = (s: string) => s.length * 10
  for (const w of [60, 70, 80, 90]) assert.ok(!wrap('Now 07:12 AM', w, measure).some(l => /:$/.test(l)), `width ${w}`)
})

test('Unmute all chats is in the glasses menu only while a chat is muted', async () => {
  const { menuItems } = await import('../app/src/core/menu.ts')
  assert.ok(menuItems('en', false, 'Stop listening', false, null, true).some(x => x.itemID === 8))
  assert.ok(!menuItems('en', false, 'Stop listening', false, null, false).some(x => x.itemID === 8))
  assert.ok(!menuItems('en', true, 'Stop listening', false, null, false).some(x => x.itemID === 8))
  assert.ok(menuItems('en', false, 'Stop listening', false, null, false).some(x => x.itemName === 'Translate: needs AI'))
})

test('a press from the R1 ring means the same as the same press on the glasses touchpad', async () => {
  const { pressOf } = await import('../app/src/core/press.ts')
  const { OsEventTypeList, EventSourceType } = await import('../app/node_modules/@evenrealities/even_hub_sdk/dist/index.js')
  for (const t of [OsEventTypeList.CLICK_EVENT, OsEventTypeList.DOUBLE_CLICK_EVENT, OsEventTypeList.LONG_PRESS_EVENT, OsEventTypeList.LONG_PRESS_RELEASE_EVENT, OsEventTypeList.SCROLL_BOTTOM_EVENT, OsEventTypeList.SCROLL_TOP_EVENT]) {
    const glasses = pressOf({ sysEvent: { eventType: t, eventSource: 1 } as any })
    const ring = pressOf({ sysEvent: { eventType: t, eventSource: EventSourceType.RING } as any })
    assert.ok(glasses !== null)
    assert.equal(ring, glasses)
  }
})

test('room: a swipe past the end while paused says "Paused", never "Nothing heard yet" (a stranger read it as listening)', () => {
  const on = roomStep(room(), { t: 'start' })
  assert.equal(edgeNote(on, 'next'), 'Nothing heard yet')
  const paused = roomStep(on, { t: 'tap' })
  assert.equal(edgeNote(paused, 'next'), 'Paused')
  assert.equal(edgeNote(paused, 'prev'), 'Nothing earlier')
})

test('undo says "Not sent" on the reply it brought back', () => {
  const s = run(start(true), { t: 'inbox', msgs: [m('x')] }, { t: 'draft', id: 'x', draft: { text: 'Sure', by: 'ai' } }, { t: 'tap' }, { t: 'prev' }).s
  assert.equal(s.view, 'draft')
  assert.match(card(s).hint!, /Not sent/)
})

test('up on the third reply goes back to the second; on the first, up shows the whole message, and the reply waits under it', () => {
  const alts = [{ text: 'One' }, { text: 'Two' }, { text: 'Three' }]
  let s = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'draft', id: 'a', draft: { text: 'One', by: 'ai', alts } }, { t: 'alt' }, { t: 'alt' }).s
  assert.equal(card(s).text, 'Three')
  s = run(s, { t: 'prev' }).s
  assert.equal(card(s).text, 'Two')
  s = run(s, { t: 'prev' }, { t: 'prev' }).s
  assert.equal(s.view, 'message')
  // Reading the whole message: a late reply does not jump over it; tap brings the reply back.
  s = run(s, { t: 'draft', id: 'a', draft: { text: 'One', by: 'ai', alts } }).s
  assert.equal(s.view, 'message')
  assert.equal(run(s, { t: 'tap' }).s.view, 'draft')
})

test('new messages queue most pressing first (the AI score on arrival), then newest', () => {
  const s = run(start(true), { t: 'inbox', msgs: [{ ...m('a', 'lunch?', 3), score: 2 }, { ...m('b', 'sign today', 1), score: 5 }, { ...m('c', 'fyi', 2) }] }).s
  assert.deepEqual(s.queue.map(q => q.id), ['b', 'a', 'c'])
})

test('a reply that came with a message is used only when it is a whole draft; plain text (the demo samples) is not', () => {
  assert.equal(isDraft({ text: 'Yes.', by: 'ai' }), true)
  assert.equal(isDraft('Yes.'), false)
  assert.equal(isDraft(undefined), false)
  // Plain text taken as a draft showed "No reply yet" on the first tap; the real draft then opens with the message.
  const s = run(start(true), { t: 'inbox', msgs: [m('a')] }, { t: 'draft', id: 'a', draft: { text: 'Yes, 3 works.', by: 'ai' } }).s
  assert.equal(card(s).text, 'Yes, 3 works.')
})
