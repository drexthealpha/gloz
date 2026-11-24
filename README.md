# Gloz

<!-- gen:first -->
**Gloz lets the executive who wears Even G2 all day read and answer every message without the phone, in their language, at their size.** In the Even Hub simulator, plain G2 text showed 0 of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew; Gloz showed 84. Gloz won 10 of 10 scripts, and cut the median time from message seen to reply sent from 3.0 s to 2.5 s.
<!-- /gen -->

[![CI](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml/badge.svg)](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml) [![live demo](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/drexthealpha/gloz/status/status.json)](https://drexthealpha.github.io/gloz/)

**Try it now, no install, no sign-in:** https://drexthealpha.github.io/gloz/ (the glasses) and https://drexthealpha.github.io/gloz/phone/ (the phone screens) · **Video, <!-- gen:video -->115 s<!-- /gen -->, in the Even Hub simulator:** https://drexthealpha.github.io/gloz/gloz-demo.mp4 · **Package:** [gloz.ehpk](https://github.com/drexthealpha/gloz/releases/latest/download/gloz.ehpk)
Click to tap, scroll to swipe, hold to speak, double click to close. "Cut the signal" shows a reply waiting through a drop.

## How it works on the glasses

One line on the glasses at a time. A new message appears with the sender's name; its lines move on at reading pace.

| You | Gloz |
|---|---|
| tap | shows the reply Gloz drafted |
| tap again | sends it, in the sender's language |
| hold, say a few words, let go | writes a new reply from what you said; it still waits for your tap |
| say "send" while holding | sends the reply on screen |
| swipe down | the next message; a skipped one stays unread on your phone |
| swipe up | back a line, or from the reply back to the message; on the empty screen, brings skipped messages back |
| double tap | closes Gloz (the glasses ask first) |
| glasses menu | bigger or smaller text, move the line, translate, mute a chat, check now, listen to the room, unmute all |
| Listen to the room | captions of the conversation around you, in your language; tap pauses the microphone, swipe up goes back to any earlier line; the transcript is on the phone to copy or share |
| phone, Chats on the glasses | pick the chats you want; with any picked, only those reach the glasses |
| swipe down past the last message | your day, one line at a time: next meeting, tasks due, weather, now playing, a stock, your latest note, what you are reading, your script, directions, a server command; tap opens it |
| hold on that screen and say anything | "add task ...", "note ...", "directions to ...", "read ...", "prompter", "run ...", "play", or any question; Gloz does it, or opens it with your words |
| double tap in any of them | back home |

Nothing is sent without your tap or your word. Text is drawn as an image with the phone's own fonts, so Arabic, Persian, Hindi, Thai and Hebrew show on the glasses, at the size you pick (6 sizes). A reply written in a language you do not read is shown to you by its meaning. Replies wait in a saved outbox through any drop and go out when the link is back.

Messages come from **Telegram (your account or a bot), Slack, Discord and Gmail**. Drafts come from **Claude, ChatGPT or any OpenRouter model**. Speech to text runs on Gloz's own backend. The backend holds every key; the glasses app holds only a pairing token. Each connector is tested against the service's documented replies with no keys ([test/connectors.test.mjs](test/connectors.test.mjs)); a run on live accounts needs your own keys in `.env`.

## For judges: where to look

| Criterion | Where to look |
|---|---|
| Usefulness on G2 · 30% | The live demo, then [the held-out results](#results): plain G2 text drops Arabic, Persian, Hindi, Thai and Hebrew; Gloz shows them, one line at a time, with the phone in the pocket. Who it is for: [Business potential](#business-potential-and-safety). |
| Read and write · 25% | Tap, tap: [app/src/core/flow.ts](app/src/core/flow.ts) (every press, tested in [test/core.test.ts](test/core.test.ts)); drafts with no long dictation: [server/ai.mjs](server/ai.mjs); time from message seen to reply sent: [eval/results/time.md](eval/results/time.md). |
| Technical execution · 20% | Real services, no stand-ins in the app: [server/connectors.mjs](server/connectors.mjs). Replies sent once even when retried: [server/app.mjs](server/app.mjs) `/send`. Outbox: [app/src/core/outbox.ts](app/src/core/outbox.ts). Tests with no keys and the evaluation in the Linux simulator run on every push: [CI](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml). Setup checked by `npm run check:setup`. |
| UX for display and voice · 15% | One line on the glasses, drawn at the wearer's size: [app/src/render.ts](app/src/render.ts), [app/src/glasses.ts](app/src/glasses.ts). Every screen says what a press does. Voice: hold, speak, let go; one word acts. The phone screens are built with shadcn/ui: [app/src/phone](app/src/phone), live at https://drexthealpha.github.io/gloz/phone/. |
| Business potential and safety · 10% | [Business potential and safety](#business-potential-and-safety): who pays, what it costs, what is stored (nothing after sending), what is never sent without the wearer. |

## Results

Locked evaluation: the protocol and the 200 held-out messages were committed before the first run ([eval/PROTOCOL.md](eval/PROTOCOL.md), [eval/set/heldout.json](eval/set/heldout.json)); changes made on the dev set are written in the protocol with the reason, before any held-out run. Both arms run in the Even Hub simulator. Plain G2 text is one firmware text container, the way any plain app shows a message; Gloz is the same message drawn by Gloz at size 3 of 6. A reader (Tesseract OCR) reads each screen; the primary score is how much blur, standing for weaker eyesight, a message survives before it is lost.

<!-- gen:heldout -->
| Script | Plain: blur survived (median px) | Gloz: blur survived (median px) | Plain: shown, sharp | Gloz: shown, sharp | Gloz wins |
|---|---|---|---|---|---|
| Arabic | not shown | 4 | 0/20 | 16/20 | yes |
| Persian | not shown | 4 | 0/20 | 15/20 | yes |
| Hindi | not shown | 4 | 0/20 | 19/20 | yes |
| Thai | not shown | 3 | 0/20 | 17/20 | yes |
| Hebrew | not shown | 4 | 0/20 | 17/20 | yes |
| Japanese | 1.5 | 4 | 19/20 | 19/20 | yes |
| Korean | 1.5 | 4 | 19/20 | 15/20 | yes |
| Chinese | 1 | 2 | 18/20 | 16/20 | yes |
| Russian | 2 | 4 | 20/20 | 20/20 | yes |
| English | 1.5 | 4 | 20/20 | 20/20 | yes |

Scripts won: 10 of 10. Shown means a character error rate of at most 0.1. Blur ladder: 0, 1, 1.5, 2, 3, 4, 5, 6, 8 px. Protocol: eval/PROTOCOL.md.
<!-- /gen -->

Time from message seen to reply sent, 200 held-out messages:

<!-- gen:time -->
| Arm | Median seconds, message seen to reply sent |
|---|---|
| Plain G2 text, reply spoken in full | 3.0 |
| Gloz, draft read, one tap | 2.5 |

Gloz faster on 120 of 200 messages. Silent reply rate with Gloz: 96 words a minute (median). Drafts by: default. Protocol: eval/PROTOCOL.md (Time, amendment 3).
<!-- /gen -->

Run it yourself: `npm run eval` (needs the simulator), `npm run eval:time`, `node eval/score.mjs`. Method and limits: [eval/PROTOCOL.md](eval/PROTOCOL.md).

## What Gloz beats

What owners asked for in public reviews, what Gloz does, Gloz's measured number, and the best measured anywhere today. Numbers come from `node eval/complaints.mjs`, `npm run eval:time` and the evaluation above.

<!-- gen:wins -->
| What G2 owners asked for | What Gloz does | Gloz | Best elsewhere |
|---|---|---|---|
| "every time I say "Even AI" the Bluetooth gets disconnected" (31 Mar 2026, Google Play) | No wake word. Gloz listens only while you hold the touchpad or ring. | 0 false wake-ups: nothing listens until you hold | 2.7% missed, at 1 false wake-up per 10 hours |
| "sometimes directly log out without doing anything" (12 Jan 2026, Google Play) | Gloz pairs once and never signs out a glasses app in use. Only a pairing unused for 90 days ends. | 365 days of daily use on a test clock, 0 forced sign-ins | 6 months without a forced sign-in |
| "the size of the font ... can be customized" (12 Aug 2026, Trustpilot) | Six text sizes, drawn as images. Pick one on the phone or from the glasses menu. | largest text 4.81 times the glasses' own text | largest text 3.1 times the default |
| "A third of the display ... constantly displaying date and time" (13 Jul 2026, App Store) | Your day, dashboard: you pick what fills the display, up to 12 panels (time, mail, next events, tasks, weather, a pinned note); hold on the glasses to choose. | 12 panels you pick on one screen, each up to 28 characters, none under 20 px | 11 fields you pick on one page (a bike computer) |
| "it shows different images in the left and right eyes" (3 Apr 2026, Google Play) | Teleprompter (say "prompter"): your script one line at a time; a tap starts following your voice, another tap pauses. | 75.2% of updates on the exact word you are reading (481-word script, simulated recognizer text with 20% errors) | 57.7% on the exact word (voice-following reading tutor, recorded speech, 2026) |
| "why can we not reply to a text message??" (21 May 2026, Google Play) | A drafted reply waits under each message. Tap to see it, tap to send it. | 96 words a minute sent, silent (fixed holding replies; AI drafts need a key) | 20.9 words a minute, silent |
| "sometimes fail with a "server error"" (6 Feb 2026, Google Play) | If one AI provider fails, the next is tried. If every one fails, a short reply in the sender's language is still ready to send. | 200 of 200 messages had a reply ready with every AI provider failing (600 failed calls) | 99.995% uptime, the best AI API status page (Aug to Nov 2026) |
| "The text jumping ... frequently causes severe dizziness" (24 Jul 2026, Trustpilot) | One line at a time. A line, or a caption, never changes while it is shown; the next one replaces it whole. | 0 of 54000 shown captions changed afterwards (0%) | 4% of shown words changed afterwards, the most stable streaming recognizer (Google, 2020) |
| "The connection with my calendar seems to constantly get lost" (10 Feb 2026, Trustpilot) | Gloz pairs once and stays connected while in use; the backend holds the service tokens. | 365 days of daily use on a test clock, 0 forced sign-ins | 6 months without a forced sign-in |
| "activate randomly without you activating them" (20 Sep 2025, Trustpilot) | Nothing listens until you hold. Nothing sends until the reply is on screen and you tap. | 0 sends from 20 single presses; 0 false wake-ups | 1 false activation per 10 hours |
| "If you start Conversate from the R1 ring it quits early" (5 Feb 2026, Trustpilot) | Listen to the room keeps going until you stop it from the glasses menu. | 54000 of 54000 pieces kept over 60 hours (logic test, not a recording) | 50 hours of continuous recording |
| "a pause gesture for Conversate directly on the glasses or ring" (27 Oct 2026, App Store) | In Listen to the room: one tap pauses (the microphone turns off), one tap goes on; swipe up reaches any earlier line. | 1 tap to pause or go on; every earlier line reachable (yes) | 1 tap to stop or restart, 10 s go-back |
| "Pro Mode used up all its credits in one 2-hour meeting (tr)" (21 Nov 2026, X) | Listen to the room has no credits and no time limit; with Whisper on the Gloz server it costs nothing per minute. | no limit (60 hours tested), $0 a month with Whisper on the server | 4 hours a meeting, unlimited minutes, $19.99 a month |
| "only have a voice input" (13 Nov 2026, X) | Reply with two taps and no voice. | 96 words a minute sent, silent (fixed holding replies; AI drafts need a key) | 20.9 words a minute, silent |
| "there seems to be a character limit (tr)" (20 Nov 2026, X) | Long messages are paged line by line. Nothing is cut. | 2,000,000 of 2,000,000 characters kept | 1.02 million characters in one note |
<!-- /gen -->

## For Even Realities: five requests for the SDK

1. **Stay connected and reconnect alone.** Best today: the phone OS wakes the companion app when the paired device comes back in range (Android Companion Device Manager presence, iOS Bluetooth state restoration).
2. **Login that works offline and never logs out.** Best today: local features with no account; sign-in valid until six months unused (Google OAuth refresh tokens); passkeys, 93% sign-in success (FIDO Passkey Index, 15 Oct 2026).
3. **No phone drain when the glasses are away.** Best today: OS presence events instead of constant scanning; Google Play flags apps where over 5% of sessions hold more than 2 hours of wake locks a day.
4. **Plugin access to phone notifications.** Best today: Apple Notification Center Service and Android NotificationListenerService.
5. **Connection state for plugins.** Best today: the OS tells the companion app on every connect and disconnect.

## Business potential and safety

- **Who pays.** Even's CEO says one third of users are company executives and that users wear G2 8 to 10 hours a day (interview, Silicon Valley Investclub, 31 Aug 2026). An executive's day is meetings; messages wait on the phone. Gloz answers them from the glasses.
- **Demand.** Owners ask in public reviews to reply from the glasses, to read their own scripts, for bigger text and for a silent way to answer. Gloz does each.
- **Launch in Even Hub.** The app is a standard Even Hub package ([app/app.json](app/app.json), `gloz.ehpk` built in CI): name without "Even", system exit dialog on double tap at the root, setup message on the glasses before pairing, setup remembered, only the permissions it uses (network to its own backend, glasses microphone, and location only while Navigation or the Dashboard is open).
- **Cost.** Gloz is free and MIT licensed. The backend's cost is the AI provider's price per draft; with no key, Gloz still works with fixed holding replies.
- **Data.** Message text lives only in the backend's memory and is dropped once the reply is sent: 0 of 200 message texts were written to disk in `eval/complaints.mjs`. Keys stay on the backend. The glasses app stores only the pairing token, settings and the outbox.
- **Money.** Gloz moves no money and gives no financial advice.
- **The people whose messages are shown.** Only chats the wearer picks; "Mute this chat" removes one. Nothing is sent without the wearer's tap or word.

### What leaves the phone and the server

| From | To | What is sent | When |
|---|---|---|---|
| Glasses app (phone) | your Gloz server only (the one address in [app/app.json](app/app.json)) | pairing token; the reply you approved; your voice while you hold | when you pair, reply or hold |
| Gloz server | Telegram, Slack, Discord, Gmail (only those you set up) | read requests for the chats you picked; the reply you approved | every 2 s; on send |
| Gloz server | the AI provider you set up (OpenRouter, Anthropic or OpenAI) | the message on screen and up to 8 earlier messages of that chat, to draft a reply; a message to translate if Translate is on | when a message is on screen |
| Gloz server | nowhere | your voice, when Whisper runs on the server | never leaves the server |

No analytics, no logs of message text. Nothing is sent to any address not listed here. Pairing uses a single-use 6-digit code; five wrong codes retire it and stop pairing for a minute, so it cannot be guessed ([test/server.test.mjs](test/server.test.mjs)).

## Setup

1. Node 24 or newer.
2. `npm ci && npm --prefix app ci`
3. `cp .env.example .env`, then add the services you use (an AI key, a Telegram bot token, Slack, Discord, Gmail). Every line is optional.
4. `npm start`: the backend prints a 6-digit pairing code.
5. `cd app && npm run dev`, then `evenhub-simulator http://localhost:5173` (or `npx evenhub qr --url http://<your-LAN-IP>:5173` for real glasses). On the phone screen, enter the server address and the code, or open the app address with `?backend=<server>&code=<code>` to pair in one step (one QR scan on real glasses).

Check every step at once: `npm run check:setup`. Package for Even Hub: `cd app && GLOZ_BACKEND_ORIGIN=https://<your Gloz server> npm run pack` (writes `gloz.ehpk` with your server in its network whitelist).

## What existed before Nov 23

- The official Even Hub `minimal` template (Vite, TypeScript, SDK wiring): the starting files of `app/`.
- Libraries: Even Hub SDK 0.0.16, CLI 0.2.0 and simulator 0.9.5; Vite; TypeScript; pngjs and tesseract.js for the evaluation. The service APIs of Telegram, Slack, Discord, Gmail, OpenRouter, Anthropic and OpenAI.
- The held-out sentences: Tatoeba (CC BY 2.0 FR).
- Public owner reviews and published best results, gathered before the build.
- Everything else in this repository was written from 23 Nov 2026.

## Licence

MIT. Sample sentences in `eval/set/` are from Tatoeba under CC BY 2.0 FR.
