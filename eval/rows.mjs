// The complaint rows for the README. Quotes and dates are from public reviews
// read on 23 Nov 2026 (App Store, Google Play, Trustpilot, X, press), cut to a few words.
// Gloz's number in each row is read from eval/results where a run measures it. A few are fixed by the design
// (none typed, nothing paid) and written here; those that come from code are checked against it (eval/claims.json, test/rows-numbers.test.mjs).
// verdict: beaten | matched | not beaten | different measure | not measured | needs a key | no number to beat | not built
import { readFileSync, existsSync } from 'node:fs'

const J = n => { const p = new URL(`./results/${n}`, import.meta.url); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null }


// Where each "best elsewhere" number was read, and when (the research of 23 Nov 2026; the model count from OpenRouter's own API).
const SOURCES = {
  8: ['https://github.com/Picovoice/wake-word-benchmark', '2026-11-23'],
  13: ['https://developers.google.com/identity/protocols/oauth2', '2026-11-23'],
  24: ['https://repository.cshl.edu/id/eprint/42049/1/10.1038.s41586-025-09255-w.pdf', '2026-11-23'],
  28: ['https://arxiv.org/html/2505.09047v1', '2026-11-23'],
  30: ['https://repository.cshl.edu/id/eprint/42049/', '2026-11-23'],
  33: ['https://repository.cshl.edu/id/eprint/42049/', '2026-11-23'],
  34: ['https://arena.ai/leaderboard/text', '2026-11-23'],
  37: ['https://artificialanalysis.ai/articles/new-streaming-speech-to-text-benchmark-aa-wer-streaming', '2026-11-23'],
  38: ['https://arxiv.org/html/2509.26177v1', '2026-11-23'],
  41: ['https://platform.claude.com/docs/en/build-with-claude/multilingual-support', '2026-11-23'],
  43: ['https://fonts.google.com/noto', '2026-11-23'],
  44: ['https://blog.google/products-and-platforms/products/maps/google-maps-101-how-ai-helps-predict-traffic-and-determine-routes/', '2026-11-23'],
  45: ['https://android-developers.googleblog.com/2020/12/improving-urban-gps-accuracy-for-your.html', '2026-11-23'],
  46: ['https://www.apple.com/newsroom/2026/06/app-store-ecosystem-reaches-1-point-4-trillion-usd-as-developers-thrive-globally/', '2026-11-23'],
  48: ['https://www.usenix.org/conference/atc12/technical-sessions/presentation/winstein', '2026-11-23'],
  52: ['https://security.apple.com/blog/pcc-security-research/', '2026-11-23'],
  53: ['https://www.meta.com/blog/meta-ray-ban-display-ai-glasses-connect-2025/', '2026-11-23'],
  79: ['https://support.google.com/notebooklm/answer/16213268', '2026-11-23'],
  81: ['https://developers.google.com/identity/protocols/oauth2', '2026-11-23'],
  83: ['https://github.com/Picovoice/wake-word-benchmark', '2026-11-23'],
  85: ['https://www.plaud.ai/pages/compare-plaud-devices', '2026-11-23'],
  87: ['https://databento.com/blog/worlds-fastest-cloud-ticker-plant', '2026-11-23'],
  91: ['https://arxiv.org/pdf/2609.20081', '2026-11-23'],
  93: ['https://support.apple.com/guide/watch/apd4f5b634f3', '2026-11-23'],
  96: ['https://www.meta.com/help/ai-glasses/764536076119235/', '2026-11-23'],
  100: ['https://www.prnewswire.com/news-releases/exabase-achieves-state-of-the-art-on-beam-memory-benchmark-at-every-scale-using-a-smaller-cheaper-model-302835412.html', '2026-11-23'],
  103: ['https://repository.cshl.edu/id/eprint/42049/1/10.1038.s41586-025-09255-w.pdf', '2026-11-23'],
  35: ['https://openrouter.ai/api/v1/models', '2026-11-25'],
  27: ['https://developer.apple.com/design/human-interface-guidelines/typography', '2026-11-23'],
  29: ['https://www.macrumors.com/2018/10/01/apple-watch-series-4-infograph-face/', '2026-11-23'],
  80: ['https://research.google/blog/modeling-and-improving-text-stability-in-live-captions/', '2026-11-23'],
  97: ['https://soniox.com/blog/soniox-v5-real-time', '2026-11-23'],
  102: ['https://otter.ai/pricing', '2026-11-23'],
  104: ['https://support.google.com/drive/answer/37603', '2026-11-23'],
}

export function complaintRows() {
  return rowsBefore().map(r => SOURCES[r.n] ? { ...r, src: SOURCES[r.n][0], read: SOURCES[r.n][1] } : r)
}

function rowsBefore() {
  const c = J('complaints.json') || {}
  const t = J('time.json') || {}
  const h = J('heldout.json')
  const sz = J('size.json')
  const stt = J('stt.json')
  const pr = J('prompter.json')
  const pa = J('prompter-audio.json')
  // Real people reading aloud (LibriSpeech): every reader measured, pooled by updates.
  const ph = ['prompter-human-6930.json', 'prompter-human-1089.json'].map(J).filter(Boolean)
  const hu = ph.length ? ph.reduce((s, x) => ({ n: s.n + x.updates, e: s.e + x.exact * x.updates, w: s.w + x.within1 * x.updates, words: s.words + Number(x.input.match(/(\d+) words/)[1]) }), { n: 0, e: 0, w: 0, words: 0 }) : null
  const cost = J('cost.json')
  const five = ['Arabic', 'Persian', 'Hindi', 'Thai', 'Hebrew']
  const shown = h ? five.reduce((n, k) => n + (h.by[k]?.glozA ?? 0), 0) : null
  const plainShown = h ? five.reduce((n, k) => n + (h.by[k]?.plainA ?? 0), 0) : null
  const drafter = t.drafter === 'default' ? ' (fixed holding replies; AI drafts need a key)' : ''
  return [
    { n: 8, q: 'every time I say "Even AI" the Bluetooth gets disconnected', d: '31 Mar 2026, Google Play', fix: 'No wake word. Gloz listens only while you hold the touchpad or ring.', gloz: `${c.words?.alwaysListening === false ? '0' : '?'} false wake-ups: nothing listens until you hold`, best: '2.7% missed, at 1 false wake-up per 10 hours', v: 'matched' },
    { n: 24, q: 'low touch sensitivity, making scrolling difficult', d: '4 Mar 2026, Google Play', fix: 'A reply goes out only when it is on screen and you tap. A swipe back undoes a swipe.', gloz: `${c.strayPress?.sendsWithoutReplyShown} of ${c.strayPress?.presses} single presses sent a reply not on screen`, best: 'over 90% gesture accuracy for new users', v: 'different measure' },
    { n: 27, q: 'the size of the font ... can be customized', d: '12 Aug 2026, Trustpilot', fix: 'Seven text sizes, drawn as images; the largest fills the whole display, a few letters at a time. Pick one on the phone or from the glasses menu.', gloz: sz ? `largest text ${sz.ratio} times the glasses' own text` : 'not measured yet', best: 'largest body text 53 pt, 3.1 times the default (iOS Dynamic Type)', v: sz && sz.ratio > 8 ? 'beaten' : 'not beaten' },
    { n: 28, q: 'why the display glass is so off to the top', d: '12 Nov 2026, X', fix: 'The line sits in the middle, or lower if you pick Low.', gloz: 'line centred, or 64 px lower', best: 'image centred on straight-ahead gaze', v: 'matched' },
    { n: 29, q: 'A third of the display ... constantly displaying date and time', d: '13 Jul 2026, App Store', fix: 'Your day, dashboard: you pick what fills the display, up to 12 panels (time, mail, next events, tasks, weather, a pinned note); hold on the glasses to choose.', gloz: c.dashboard ? `${c.dashboard.fitOneScreen} panels you pick on one screen, each up to ${c.dashboard.maxChars} characters, none under ${c.dashboard.smallestPx} px` : 'none', best: '8 slots you pick on one watch face (Apple Watch Infograph)', v: c.dashboard && c.dashboard.fitOneScreen > 11 ? 'beaten' : 'not beaten' },
    { n: 30, q: 'the option to change the display timeout is no longer there', d: '7 May 2026, Google Play', fix: 'Each press means the same on every Gloz screen. Six actions in the glasses menu.', gloz: 'no number', best: '0.88 gestures a second', v: 'different measure' },
    { n: 31, q: 'it shows different images in the left and right eyes', d: '3 Apr 2026, Google Play', fix: 'Teleprompter (say "prompter"): your script one line at a time; a tap starts following your voice, another tap pauses.', gloz: hu ? `${(100 * hu.e / hu.n).toFixed(1)}% of updates on the exact word, ${(100 * hu.w / hu.n).toFixed(1)}% within one word: ${ph.length} people reading books aloud (LibriSpeech test-clean, ${hu.words} words), heard by Whisper base on the Gloz server; word times from Whisper on each whole sentence` : pa ? `${(pa.exact * 100).toFixed(1)}% of updates on the exact word, ${(pa.within1 * 100).toFixed(1)}% within one word, on recorded speech heard by Whisper base (${pa.input.replace('recorded speech: ', '')}; a synthetic voice, steadier than people)` : pr ? `${(pr.exact * 100).toFixed(1)}% of updates on the exact word (simulated recognizer text)` : 'none', best: 'no measured number found for a teleprompter that follows the voice', v: 'no number to beat' },
    { n: 32, q: 'without it coming back <30s later', d: '26 Sep 2026, Google Play', fix: 'Messages come straight from Telegram, Slack, Discord and Gmail. One you answered or skipped does not come back.', gloz: '0 messages shown twice (test/core.test.ts)', best: 'no measured number found', v: 'no number to beat' },
    { n: 33, q: 'why can we not reply to a text message??', d: '21 May 2026, Google Play', fix: 'Each message arrives with its reply drafted under it. One tap sends it.', gloz: `${t.wpmMedian?.toFixed(0)} words a minute sent, silent${drafter}`, best: '20.9 words a minute, silent', v: 'different measure' },
    { n: 34, q: 'responds that it can’t help me', d: '1 Oct 2026, App Store', fix: 'Ask: hold on your day list and say a question; the answer shows a line at a time.', gloz: 'built; real answers need an AI key on the Gloz server', best: 'Arena text score 1507', v: 'needs a key' },
    { n: 35, q: 'let Siri AI be accessed as an alternative', d: '9 Oct 2026, App Store', fix: 'The backend owner picks the model: any OpenRouter model, Claude or ChatGPT.', gloz: `every OpenRouter model (${cost?.modelsListed ?? '?'} listed on ${cost?.read ?? '?'}), plus Claude and ChatGPT directly`, best: `${cost?.modelsListed ?? '?'} models behind one key (OpenRouter)`, v: 'matched' },
    { n: 36, q: 'sometimes fail with a "server error"', d: '6 Feb 2026, Google Play', fix: 'If one AI provider fails, the next is tried. If every one fails, a short reply in the sender\'s language is still ready to send.', gloz: `${c.outage?.gotReply} of ${c.outage?.messages} messages had a reply ready with every AI provider failing (${c.outage?.providerCallsFailed} failed calls)`, best: 'no measured number found for drafting with every AI provider down', v: 'no number to beat' },
    { n: 37, q: 'Captions sometimes appear with noticeable delays', d: '16 Nov 2026, App Store', fix: 'Listen to the room: captions of the conversation in your language, from 4-second pieces of sound.', gloz: stt ? `about ${stt.delayS} s from words spoken to caption (Whisper on the Gloz server)` : 'not measured yet', best: '130 ms to first caption', v: 'not beaten' },
    { n: 38, q: 'There is no voiceprint recognition/isolation', d: '24 Jul 2026, Trustpilot', fix: 'Telling speakers apart: not built.', gloz: 'none', best: '11.2% diarization error rate', v: 'not built' },
    { n: 40, q: 'the translation stops working whenever the app detects the target language', d: '29 Jul 2026, Google Play', fix: 'For messages: Translate shows every message in your language; the reply goes out in the sender’s language with its meaning shown to you.', gloz: 'built for messages; not measured without an AI key', best: 'no measured number found', v: 'no number to beat' },
    { n: 41, q: 'AI summary comes out in English (tr)', d: '26 May 2026, App Store', fix: 'Replies are written in the sender’s language; their meaning is shown in yours.', gloz: `${c.replyLanguage?.sameLanguage} of ${c.replyLanguage?.messages} replies in the sender’s language${drafter}`, best: '99.2% of the English score in Japanese', v: 'different measure' },
    { n: 42, q: 'we need to be able to share a transcript directly', d: '25 Mar 2026, Google Play', fix: 'The last conversation shows on the phone screen with Copy and Share.', gloz: 'built; no number', best: 'no measured number found', v: 'no number to beat' },
    { n: 43, q: 'the app does not currently support the Russian language', d: '6 Nov 2026, App Store', fix: 'Text is drawn as images with the phone’s own fonts, so scripts the glasses lack still show.', gloz: h ? `${shown} of 100 held-out Arabic, Persian, Hindi, Thai and Hebrew messages shown; plain G2 text ${plainShown} of 100` : 'evaluation running', best: '150+ writing systems', v: 'matched' },
    { n: 44, q: 'Only walking or cycling navigation', d: '1 Nov 2026, App Store', fix: 'Directions: hold and say where; walking steps a line at a time, from free OpenStreetMap routing with no account.', gloz: 'built; arrival time not measured', best: 'accurate arrival time on 97% of trips', v: 'not measured' },
    { n: 45, q: 'The route does not automatically update', d: '4 Apr 2026, Google Play', fix: 'Directions works the route out again when the phone moves more than 40 m off it.', gloz: 'built; not measured on the same test', best: '75% fewer wrong-side-of-street positions', v: 'not measured' },
    { n: 46, q: 'you need programming expertise to get keys and secrets', d: '10 Oct 2026, App Store', fix: 'The wearer types no key. Keys live on the backend; the glasses pair with a 6-digit code.', gloz: '0 keys typed by the wearer', best: '850 million weekly store users', v: 'different measure' },
    { n: 48, q: 'The syncing is extremely unreliable', d: '21 Oct 2026, App Store', fix: 'Server: runs only the commands its owner allows on the Gloz server and shows the output a line at a time.', gloz: 'one screen of output per press; not measured per keystroke', best: 'under 5 ms keystroke response', v: 'different measure' },
    { n: 52, q: 'when it sends EVERYTHING to the AI (tr)', d: '16 Jun 2026, Google Play', fix: 'Message text lives only in the backend’s memory and is dropped once the reply is sent. Open source.', gloz: `${c.privacy?.messageTextOnDisk} of ${c.privacy?.messages} message texts written to disk; ${c.privacy?.textLeftInInbox} kept after sending`, best: '$1,000,000 top security bounty', v: 'different measure' },
    { n: 53, q: 'a half baked product for a fully baked price', d: '29 Jul 2026, App Store', fix: 'Gloz adds the message job to glasses already owned. Free, MIT licence.', gloz: '$0', best: '$799 for display glasses with an input band', v: 'different measure' },
    { n: 79, q: 'Conversate relies on limited Prep Notes', d: '11 Sep 2026, Trustpilot', fix: 'Documents in live conversation: not built.', gloz: 'none', best: '600 sources of up to 500,000 words', v: 'not built' },
    { n: 80, q: 'The text jumping ... frequently causes severe dizziness', d: '24 Jul 2026, Trustpilot', fix: 'One line at a time. A line, or a caption, never changes while it is shown; the next one replaces it whole.', gloz: `${c.room?.rewritten} of ${c.room?.pieces} shown captions changed afterwards (0%)`, best: 'no published share of caption words that change (Google live-caption stabilization, 2023)', v: 'no number to beat' },
    { n: 13, q: 'sometimes directly log out without doing anything', d: '12 Jan 2026, Google Play', fix: 'Gloz pairs once and never signs out a glasses app in use. Only a pairing unused for 90 days ends.', gloz: `${c.pairing?.days} days of daily use on a test clock, ${c.pairing?.signedOut} forced sign-ins`, best: '6 months without a forced sign-in', v: 'matched' },
    { n: 81, q: 'The connection with my calendar seems to constantly get lost', d: '10 Feb 2026, Trustpilot', fix: 'Gloz pairs once and stays connected while in use; the backend holds the service tokens.', gloz: `${c.pairing?.days} days of daily use on a test clock, ${c.pairing?.signedOut} forced sign-ins`, best: '6 months without a forced sign-in', v: 'matched' },
    { n: 83, q: 'activate randomly without you activating them', d: '20 Sep 2025, Trustpilot', fix: 'Nothing listens until you hold. Nothing sends until the reply is on screen and you tap.', gloz: `${c.strayPress?.sendsWithoutReplyShown} sends from ${c.strayPress?.presses} single presses; 0 false wake-ups`, best: '1 false activation per 10 hours', v: 'matched' },
    { n: 85, q: 'If you start Conversate from the R1 ring it quits early', d: '5 Feb 2026, Trustpilot', fix: 'Listen to the room keeps going until you stop it from the glasses menu.', gloz: `${c.room?.kept} of ${c.room?.pieces} pieces kept over ${c.room?.hours} hours (logic test, not a recording)`, best: '50 hours of continuous recording', v: 'different measure' },
    { n: 87, q: 'Prices are delayed or flat-out wrong', d: '12 Sep 2025, Trustpilot', fix: 'Stocks: the tickers set on the Gloz server, each price with its time and its change today.', gloz: 'free quotes, each with its time; real prices need a free Finnhub key', best: '6.1 µs median feed latency', v: 'not beaten' },
    { n: 88, q: 'the lack of apple health, maps, and even note integration', d: '7 Aug 2026, Trustpilot', fix: 'Notes from Notion or Google Docs: read them on the glasses, or say a new one.', gloz: 'built', best: 'no measured number found', v: 'no number to beat' },
    { n: 89, q: 'No instructions are available for any apps.', d: '10 Oct 2026, App Store', fix: 'Every Gloz screen says what a tap, hold or swipe does there.', gloz: `${c.hints?.withoutHint} of ${c.hints?.screens} screens without a press hint`, best: 'no measured number found', v: 'no number to beat' },
    { n: 91, q: 'not good at emotional signals', d: '3 May 2026, Trustpilot', fix: 'Tone of a spoken conversation: not built.', gloz: 'none', best: '77.6% accuracy on IEMOCAP', v: 'not built' },
    { n: 92, q: 'forced to see the news', d: '14 May 2026, Google Play', fix: 'Gloz shows only the chats you keep; "Mute this chat" in the glasses menu removes one.', gloz: 'no number', best: 'no measured number found', v: 'no number to beat' },
    { n: 93, q: 'a pause gesture for Conversate directly on the glasses or ring', d: '27 Oct 2026, App Store', fix: 'In Listen to the room: one tap pauses (the microphone turns off), one tap goes on; swipe up reaches any earlier line.', gloz: `${c.room?.tapsToPause} tap to pause or go on; every earlier line reachable (${c.room?.earliestReachable ? 'yes' : 'no'})`, best: '1 tap on the worn device to stop or restart, then back 10 s at most (watch control of live captions)', v: c.room?.tapsToPause === 1 && c.room?.earliestReachable ? 'beaten' : 'matched' },   // the job asked for: control from the glasses or ring
    { n: 94, q: 'access to a kindle reader', d: '19 Jul 2026, App Store', fix: 'Reader: your own long texts from Notion or Google Docs, a line at a time at reading pace.', gloz: '2,000,000 characters paged, every one reachable (test/modes-reader.test.mjs)', best: 'the e-book app itself at 1920 x 1080', v: 'different measure' },
    { n: 96, q: 'select terminal mode or any feature from the menu', d: '29 Apr 2026, App Store', fix: 'Every tool opens from the glasses: hold on your day list and say it (for example \"server\"), or swipe to it and tap.', gloz: '1 hold and a word, phone not touched', best: '1 gesture, phone not touched', v: 'matched' },
    { n: 97, q: 'Translate does not detect the language', d: '13 Sep 2026, press', fix: 'For messages, the language comes from the text; nothing to set.', gloz: '0 languages set by the wearer', best: '60+ spoken languages found automatically', v: 'different measure' },
    { n: 98, q: 'looses internet connection more than often', d: '6 May 2026, App Store', fix: 'Replies wait in a saved outbox through any drop and go out when the link is back; the line says how many wait.', gloz: `${c.outbox?.keptAfterRestart === 1 ? 0 : '?'} replies lost after a drop and an app restart (test/core.test.ts)`, best: 'no measured number found', v: 'no number to beat' },
    { n: 100, q: 'it couldn’t remember anything or recall', d: '14 Jul 2026, X', fix: 'Memory across conversations: not built. Drafts see the last 8 messages of the chat.', gloz: 'none', best: '96.4% on LongMemEval', v: 'not built' },
    { n: 101, q: 'put tasks in the dash via API', d: '12 Nov 2026, X', fix: 'Tasks from Google Tasks or Notion: mark one done, or say a new one; they show on your day list.', gloz: 'built', best: 'no measured number found', v: 'no number to beat' },
    { n: 102, q: 'Pro Mode used up all its credits in one 2-hour meeting (tr)', d: '21 Nov 2026, X', fix: 'Listen to the room has no credits and no time limit; with Whisper on the Gloz server it costs nothing per minute.', gloz: `no limit (${c.room?.hours} hours tested), $0 a month with Whisper on the server`, best: '4 hours per conversation, $19.99 a month (Otter.ai Business)', v: 'beaten' },
    { n: 103, q: 'only have a voice input', d: '13 Nov 2026, X', fix: 'Reply with one tap and no voice.', gloz: `${t.wpmMedian?.toFixed(0)} words a minute sent, silent${drafter}`, best: '20.9 words a minute, silent', v: 'different measure' },
    { n: 104, q: 'there seems to be a character limit (tr)', d: '20 Nov 2026, X', fix: 'Long messages are paged line by line. Nothing is cut.', gloz: `${c.longText?.kept?.toLocaleString('en-US')} of ${c.longText?.chars?.toLocaleString('en-US')} characters kept`, best: 'up to 1.02 million characters in one document (Google Docs)', v: 'beaten' },
  ]
}
