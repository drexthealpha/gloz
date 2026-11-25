# Gloz

<!-- gen:first -->
**Gloz lets the executive who wears Even G2 all day read and answer every message without the phone, in their language, at their size.** In the Even Hub simulator, plain G2 text showed 0 of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew; Gloz showed 84. Gloz won 10 of 10 scripts, and cut the median time from message seen to reply sent from 3.0 s to 2.5 s.
<!-- /gen -->

[![CI](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml/badge.svg)](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml) [![live demo](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/drexthealpha/gloz/status/status.json)](https://drexthealpha.github.io/gloz/)

**Try it now, no install, no sign-in:** https://drexthealpha.github.io/gloz/ (the glasses) and https://drexthealpha.github.io/gloz/phone/ (the phone screens; any 6 digits pair there) · **Video, <!-- gen:video -->115 s<!-- /gen -->, in the Even Hub simulator:** https://drexthealpha.github.io/gloz/gloz-demo.mp4 · **Package:** [gloz.ehpk](https://github.com/drexthealpha/gloz/releases/latest/download/gloz.ehpk)
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

**Track:** 01 Messaging & News (main) and 04 AI Assistants & Work.

| Criterion | Where to look |
|---|---|
| Usefulness on G2 · 30% | The live demo, then [the held-out results](#results): plain G2 text drops Arabic, Persian, Hindi, Thai and Hebrew; Gloz shows them, one line at a time, with the phone in the pocket. Who it is for: [Business potential](#business-potential-and-safety). |
| Read and write · 25% | Tap, tap: [app/src/core/flow.ts](app/src/core/flow.ts) (every press, tested in [test/core.test.ts](test/core.test.ts)); drafts with no long dictation: [server/ai.mjs](server/ai.mjs); time from message seen to reply sent: [eval/results/time.md](eval/results/time.md). |
| Technical execution · 20% | Real services, no stand-ins in the app: [server/connectors.mjs](server/connectors.mjs). Replies sent once even when retried: [server/app.mjs](server/app.mjs) `/send`. Outbox: [app/src/core/outbox.ts](app/src/core/outbox.ts). Tests with no keys and the evaluation in the Linux simulator run on every push: [CI](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml). Setup checked by `npm run check:setup`. |
| UX for display and voice · 15% | One line on the glasses, drawn at the wearer's size: [app/src/render.ts](app/src/render.ts), [app/src/glasses.ts](app/src/glasses.ts). Every screen says what a press does. Voice: hold, speak, let go; one word acts. The phone screens are built with shadcn/ui: [app/src/phone](app/src/phone), live at https://drexthealpha.github.io/gloz/phone/. |
| Business potential and safety · 10% | [Business potential and safety](#business-potential-and-safety): who pays, what it costs, what is stored (nothing after sending), what is never sent without the wearer. |

## Results

Locked evaluation: the protocol and the 200 held-out messages were committed before the first run ([eval/PROTOCOL.md](eval/PROTOCOL.md), [eval/set/heldout.json](eval/set/heldout.json)): locked 23 Nov 11:19, first held-out run 23 Nov 14:00. The public history was squashed on 23 and 24 Nov to remove private files, so main no longer shows those two commits; changes made on the dev set are written in the protocol with the reason, before any held-out run. Both arms run in the Even Hub simulator. Plain G2 text is one firmware text container, the way any plain app shows a message; Gloz is the same message drawn by Gloz at size 3 of 6. A reader (Tesseract OCR) reads each screen; the primary score is how much blur, standing for weaker eyesight, a message survives before it is lost.

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

## Complaints Gloz fixes

Every complaint from public reviews that a glasses app can act on: what owners said, what Gloz does, Gloz's measured number, the best measured anywhere today, and the result. "Gloz ahead" means Gloz's number is better on the same measure. Numbers come from `node eval/complaints.mjs`, `npm run eval:time` and the evaluation above.

<!-- gen:wins -->
| What G2 owners asked for | What Gloz does | Gloz | Best elsewhere | Result |
|---|---|---|---|---|
| "the size of the font ... can be customized" (12 Aug 2026, Trustpilot) | Seven text sizes, drawn as images; the largest fills the whole display, a few letters at a time. Pick one on the phone or from the glasses menu. | largest text 8.81 times the glasses' own text | screen magnification up to 8 times (Android) | Gloz ahead |
| "A third of the display ... constantly displaying date and time" (13 Jul 2026, App Store) | Your day, dashboard: you pick what fills the display, up to 12 panels (time, mail, next events, tasks, weather, a pinned note); hold on the glasses to choose. | 12 panels you pick on one screen, each up to 28 characters, none under 20 px | 11 fields you pick on one page (a bike computer) | Gloz ahead |
| "every time I say "Even AI" the Bluetooth gets disconnected" (31 Mar 2026, Google Play) | No wake word. Gloz listens only while you hold the touchpad or ring. | 0 false wake-ups: nothing listens until you hold | 2.7% missed, at 1 false wake-up per 10 hours | matched |
| "sometimes directly log out without doing anything" (12 Jan 2026, Google Play) | Gloz pairs once and never signs out a glasses app in use. Only a pairing unused for 90 days ends. | 365 days of daily use on a test clock, 0 forced sign-ins | 6 months without a forced sign-in | matched |
| "why the display glass is so off to the top" (12 Nov 2026, X) | The line sits in the middle, or lower if you pick Low. | line centred, or 72 px lower | image centred on straight-ahead gaze | matched |
| "let Siri AI be accessed as an alternative" (9 Oct 2026, App Store) | The backend owner picks the model: any OpenRouter model, Claude or ChatGPT. | every OpenRouter model (472 listed on 2026-11-25), plus Claude and ChatGPT directly | 472 models behind one key (OpenRouter) | matched |
| "the app does not currently support the Russian language" (6 Nov 2026, App Store) | Text is drawn as images with the phone’s own fonts, so scripts the glasses lack still show. | 84 of 100 held-out Arabic, Persian, Hindi, Thai and Hebrew messages shown; plain G2 text 0 of 100 | 150+ writing systems | matched |
| "The text jumping ... frequently causes severe dizziness" (24 Jul 2026, Trustpilot) | One line at a time. A line, or a caption, never changes while it is shown; the next one replaces it whole. | 0 of 54000 shown captions changed afterwards (0%) | 4% of shown words changed afterwards, the most stable streaming recognizer (Google, 2020) | matched |
| "The connection with my calendar seems to constantly get lost" (10 Feb 2026, Trustpilot) | Gloz pairs once and stays connected while in use; the backend holds the service tokens. | 365 days of daily use on a test clock, 0 forced sign-ins | 6 months without a forced sign-in | matched |
| "activate randomly without you activating them" (20 Sep 2025, Trustpilot) | Nothing listens until you hold. Nothing sends until the reply is on screen and you tap. | 0 sends from 20 single presses; 0 false wake-ups | 1 false activation per 10 hours | matched |
| "a pause gesture for Conversate directly on the glasses or ring" (27 Oct 2026, App Store) | In Listen to the room: one tap pauses (the microphone turns off), one tap goes on; swipe up reaches any earlier line. | 1 tap to pause or go on; every earlier line reachable (yes) | 1 tap to stop or restart, 10 s go-back | matched |
| "select terminal mode or any feature from the menu" (29 Apr 2026, App Store) | Every tool opens from the glasses: hold on your day list and say it (for example "server"), or swipe to it and tap. | 1 hold and a word, phone not touched | 1 gesture, phone not touched | matched |
| "Pro Mode used up all its credits in one 2-hour meeting (tr)" (21 Nov 2026, X) | Listen to the room has no credits and no time limit; with Whisper on the Gloz server it costs nothing per minute. | no limit (60 hours tested), $0 a month with Whisper on the server | no time limit, free (live transcription apps) | matched |
| "there seems to be a character limit (tr)" (20 Nov 2026, X) | Long messages are paged line by line. Nothing is cut. | 2,000,000 of 2,000,000 characters kept | no length limit (plain-text notes apps) | matched |
| "Captions sometimes appear with noticeable delays" (16 Nov 2026, App Store) | Listen to the room: captions of the conversation in your language, from 4-second pieces of sound. | about 7.2 s from words spoken to caption (Whisper on the Gloz server) | 130 ms to first caption | not beaten |
| "Prices are delayed or flat-out wrong" (12 Sep 2025, Trustpilot) | Stocks: the tickers set on the Gloz server, each price with its time and its change today. | free quotes, each with its time; real prices need a free Finnhub key | 6.1 µs median feed latency | not beaten |
| "low touch sensitivity, making scrolling difficult" (4 Mar 2026, Google Play) | A reply goes out only when it is on screen and you tap. A swipe back undoes a swipe. | 0 of 20 single presses sent a reply not on screen | over 90% gesture accuracy for new users | different measure |
| "the option to change the display timeout is no longer there" (7 May 2026, Google Play) | Each press means the same on every Gloz screen. Six actions in the glasses menu. | no number | 0.88 gestures a second | different measure |
| "it shows different images in the left and right eyes" (3 Apr 2026, Google Play) | Teleprompter (say "prompter"): your script one line at a time; a tap starts following your voice, another tap pauses. | 75.2% of updates on the exact word you are reading (481-word script, simulated recognizer text with 20% errors) | 57.7% on the exact word (voice-following reading tutor, recorded speech, 2026) | different measure |
| "why can we not reply to a text message??" (21 May 2026, Google Play) | A drafted reply waits under each message. Tap to see it, tap to send it. | 96 words a minute sent, silent (fixed holding replies; AI drafts need a key) | 20.9 words a minute, silent | different measure |
| "sometimes fail with a "server error"" (6 Feb 2026, Google Play) | If one AI provider fails, the next is tried. If every one fails, a short reply in the sender's language is still ready to send. | 200 of 200 messages had a reply ready with every AI provider failing (600 failed calls) | 99.995% uptime, the best AI API status page (Aug to Nov 2026) | different measure |
| "AI summary comes out in English (tr)" (26 May 2026, App Store) | Replies are written in the sender’s language; their meaning is shown in yours. | 200 of 200 replies in the sender’s language (fixed holding replies; AI drafts need a key) | 99.2% of the English score in Japanese | different measure |
| "you need programming expertise to get keys and secrets" (10 Oct 2026, App Store) | The wearer types no key. Keys live on the backend; the glasses pair with a 6-digit code. | 0 keys typed by the wearer | 850 million weekly store users | different measure |
| "The syncing is extremely unreliable" (21 Oct 2026, App Store) | Server: runs only the commands its owner allows on the Gloz server and shows the output a line at a time. | one screen of output per press; not measured per keystroke | under 5 ms keystroke response | different measure |
| "when it sends EVERYTHING to the AI (tr)" (16 Jun 2026, Google Play) | Message text lives only in the backend’s memory and is dropped once the reply is sent. Open source. | 0 of 200 message texts written to disk; 0 kept after sending | $1,000,000 top security bounty | different measure |
| "a half baked product for a fully baked price" (29 Jul 2026, App Store) | Gloz adds the message job to glasses already owned. Free, MIT licence. | $0 | $799 for display glasses with an input band | different measure |
| "If you start Conversate from the R1 ring it quits early" (5 Feb 2026, Trustpilot) | Listen to the room keeps going until you stop it from the glasses menu. | 54000 of 54000 pieces kept over 60 hours (logic test, not a recording) | 50 hours of continuous recording | different measure |
| "access to a kindle reader" (19 Jul 2026, App Store) | Reader: your own long texts from Notion or Google Docs, a line at a time at reading pace. | 2,000,000 characters paged, every one reachable (tests) | the e-book app itself at 1920 x 1080 | different measure |
| "Translate does not detect the language" (13 Sep 2026, press) | For messages, the language comes from the text; nothing to set. | 0 languages set by the wearer | 60+ spoken languages found automatically | different measure |
| "only have a voice input" (13 Nov 2026, X) | Reply with two taps and no voice. | 96 words a minute sent, silent (fixed holding replies; AI drafts need a key) | 20.9 words a minute, silent | different measure |
| "Only walking or cycling navigation" (1 Nov 2026, App Store) | Directions: hold and say where; walking steps a line at a time, from free OpenStreetMap routing with no account. | built; arrival time not measured | accurate arrival time on 97% of trips | not measured |
| "The route does not automatically update" (4 Apr 2026, Google Play) | Directions works the route out again when the phone moves more than 40 m off it. | built; not measured on the same test | 75% fewer wrong-side-of-street positions | not measured |
| "responds that it can’t help me" (1 Oct 2026, App Store) | Ask: hold on your day list and say a question; the answer shows a line at a time. | built; real answers need an AI key on the Gloz server | Arena text score 1507 | needs a key |
| "without it coming back <30s later" (26 Sep 2026, Google Play) | Messages come straight from Telegram, Slack, Discord and Gmail. One you answered or skipped does not come back. | 0 messages shown twice (tests) | no measured number found | no number to beat |
| "the translation stops working whenever the app detects the target language" (29 Jul 2026, Google Play) | For messages: Translate shows every message in your language; the reply goes out in the sender’s language with its meaning shown to you. | built for messages; not measured without an AI key | no measured number found | no number to beat |
| "we need to be able to share a transcript directly" (25 Mar 2026, Google Play) | The last conversation shows on the phone screen with Copy and Share. | built; no number | no measured number found | no number to beat |
| "the lack of apple health, maps, and even note integration" (7 Aug 2026, Trustpilot) | Notes from Notion or Google Docs: read them on the glasses, or say a new one. | built | no measured number found | no number to beat |
| "No instructions are available for any apps." (10 Oct 2026, App Store) | Every Gloz screen says what a tap, hold or swipe does there. | 0 of 7 screens without a press hint | no measured number found | no number to beat |
| "forced to see the news" (14 May 2026, Google Play) | Gloz shows only the chats you keep; "Mute this chat" in the glasses menu removes one. | no number | no measured number found | no number to beat |
| "looses internet connection more than often" (6 May 2026, App Store) | Replies wait in a saved outbox through any drop and go out when the link is back; the line says how many wait. | 0 replies lost after a drop and an app restart (tests) | no measured number found | no number to beat |
| "put tasks in the dash via API" (12 Nov 2026, X) | Tasks from Google Tasks or Notion: mark one done, or say a new one; they show on your day list. | built | no measured number found | no number to beat |
| "There is no voiceprint recognition/isolation" (24 Jul 2026, Trustpilot) | Telling speakers apart: not built. | none | 11.2% diarization error rate | not built |
| "Conversate relies on limited Prep Notes" (11 Sep 2026, Trustpilot) | Documents in live conversation: not built. | none | 600 sources of up to 500,000 words | not built |
| "not good at emotional signals" (3 May 2026, Trustpilot) | Tone of a spoken conversation: not built. | none | 77.6% accuracy on IEMOCAP | not built |
| "it couldn’t remember anything or recall" (14 Jul 2026, X) | Memory across conversations: not built. Drafts see the last 8 messages of the chat. | none | 96.4% on LongMemEval | not built |
<!-- /gen -->

## For Even Realities: five requests for the SDK

1. **Stay connected and reconnect alone.** Best today: the phone OS wakes the companion app when the paired device comes back in range (Android Companion Device Manager presence, iOS Bluetooth state restoration).
2. **Login that works offline and never logs out.** Best today: local features with no account; sign-in valid until six months unused (Google OAuth refresh tokens); passkeys, 93% sign-in success (FIDO Passkey Index, 15 Oct 2026).
3. **No phone drain when the glasses are away.** Best today: OS presence events instead of constant scanning; Google Play flags apps where over 5% of sessions hold more than 2 hours of wake locks a day.
4. **Plugin access to phone notifications.** Best today: Apple Notification Center Service and Android NotificationListenerService.
5. **Connection state for plugins.** Best today: the OS tells the companion app on every connect and disconnect.

### Complaints only Even Realities can fix

These 69 complaints are about the hardware, the Even app, the store or the company, so no glasses app can fix them. For each: what owners said, the best solution found today, and the number to beat.

| # | What owners said | Best solution today | Number to beat |
|---|---|---|---|
| 1 | "My g2 glasses and r1 ring will not stay connected to the app" (10 Jul 2026, App Store) | Android Companion Device Manager; iOS State Restoration with AccessorySetupKit | None published |
| 2 | "Once it drops from memory the connection to the glasses are lost" (28 Feb 2026, Google Play) | Android CompanionDeviceService; iOS State Restoration relaunch | None published |
| 3 | "The glass doesn't connect to the app after removing from the case and wearing it..." (15 Mar 2026, Google Play) | Android startObservingDevicePresence; iOS State Restoration background relaunch | None published |
| 4 | "If it drops while charging, it errors and won't charge until I reset or reseat..." (tr) (8 Aug 2026, Google Play) | No published solution | None published |
| 5 | "Drops easily in busy streets and on the Yamanote line" (tr) (3 Jul 2026, Google Play) | Bluetooth LE Coded PHY (S=8), a stronger link than LE 1M | 12 dB link budget gain over LE 1M |
| 6 | "when i connect my earbuds, the ring constantly disconnects and reconnects" (10 Aug 2026, App Store) | No published solution; Android 10 and later batch BLE connection requests (method only) | None published |
| 7 | "connection with the phone is often lost when several apps are open" (tr) (3 Aug 2026, Google Play) | Google Play vitals memory limits plus Android CompanionDeviceService | 1.50 GB background memory on an 8 GB phone (Google Play vitals) |
| 9 | "The app will not allow you to enter if your internet is bad." (31 May 2026, App Store) | An open-source wearable companion app: 691 wearable models, no account, no vendor server | None published |
| 10 | "App keeps crashing and refuses to start. Using One UI 9.0 latest version..." (26 Oct 2026, Google Play) | Google Play Android vitals per-device crash and ANR limits | Under 8% crash rate on every single phone model (Google Play Android vitals) |
| 11 | "can't login to the app half the time, which means you can't access features..." (30 Oct 2026, Google Play) | Auth0 (Okta) enterprise login with a contractual availability guarantee | 99.99% login availability (Auth0) |
| 12 | "requires login for basic functionality including '100% local ai terminal mode' and notifications." (30 Oct 2026, Google Play) | An open-source companion app runs the Even Realities G1 with no account | 0 accounts needed for local features |
| 13 | "having to login every single time you want to use the glasses" (14 Feb 2025, Google Play) | Google OAuth refresh tokens, valid until six months unused | 6 months without forced re-login (Google OAuth) |
| 14 | "it enters special characters every time as standard which isn't supported in your password..." (3 Nov 2026, App Store) | Passkeys (FIDO): no password, no emailed code | 93% sign-in success (passkeys) |
| 15 | "Don't force us to link a device that we don't have..." (21 Apr 2025, Google Play) | An open-source companion app opens and runs with no device and no account | None published |
| 16 | "Within just one hour of waking up, my iPhone battery drops to approximately 80%..." (13 Nov 2026, App Store) | Google Play wake-lock limit plus Companion Device presence instead of scanning | Under 5% of sessions with more than 2 hours of wake locks per day (Google Play) |
| 17 | "...location checking it uses a little more than 15% of my 20,000mAh battery..." (22 Feb 2026, Google Play) | Android Companion Device Manager pairing without location permission | 0 location permissions needed for Bluetooth pairing and scanning |
| 18 | "...try to reconnect later, the app will be forever stuck in a crash loop" (18 Oct 2026, Google Play) | Crash-free sessions of top apps (Luciq 2026 benchmarks) | 99.99% crash-free sessions (Luciq, 2026) |
| 19 | "The 2.2.7 upgrade completely knocked out a perfectly performing AI teleprompter feature..." (2 Aug 2026, App Store) | Apple App Store phased release over 7 days | 1% of users on the first day of a release (Apple App Store) |
| 20 | "It will download it, but it won't install." (22 Jul 2026, App Store) | Android A/B system updates, which fall back to the old partition | None published |
| 21 | "...but the display sometimes becomes completely black." (18 Jul 2026, Google Play) | No published solution; nearest is an Ultrahuman device fleet with Memfault diagnostics | None published |
| 22 | "The next morning I opened the case and both lenses had cracks in them." (22 Sep 2026, App Store) | US FDA drop-ball rule for lenses; a display-glasses maker offers two frame sizes | 50 inch drop-ball pass per lens (US FDA); 2 frame sizes |
| 23 | "battery life on both diminish after 3 months on both G2 & R1." (22 Aug 2026, Google Play) | Apple iPhone 15 and later batteries rated for over 1,000 cycles | 80% capacity after 1,000 cycles (Apple) |
| 25 | "found the ring loose and bouncing around inside the box." (28 Feb 2026, Google Play) | Oura Ring 4 free sizing kit with Size Later | 12 sizes with a free sizing kit (Oura) |
| 26 | "Solo faltaría la integración de los datos de R1 con Google health connect." (17 Oct 2026, Google Play) | Oura writes ring health data types to Google Health Connect | 9 health data types written to Health Connect (Oura) |
| 39 | "It needs the internet even for conversation (transcription)." (26 Jul 2026, Google Play) | Cohere Labs Transcribe offline model; Apple Live Translation on-device | 5.42% word error rate from a model that can run offline (Cohere Labs) |
| 47 | "plugins like the voice recorder require the phone app to remain open, limiting usability." (8 Jun 2026, Google Play) | Android NotificationListenerService and Apple ANCS, both absent from the G2 SDK | None published |
| 49 | "Contacting support has been problematic and only seems to be a remote AI." (9 Apr 2026, Google Play) | Zappos 365-day return policy | 365-day return window (Zappos) |
| 50 | "The order took over 8 weeks to deliver (2 months)" (28 Apr 2026, App Store) | An optical retail chain makes prescription glasses in one day | 2 business days for prescription glasses |
| 51 | "No longer supports the G1 generation glasses. what am I supposed to do..." (23 Jun 2026, Google Play) | Fairphone Gen. 6 software support until 2033 | 8 years of software support (Fairphone) |
| 54 | "the goodwill offer presented to me was just $10 toward accessories" (16 Nov 2026, Trustpilot) | EU Sale of Goods Directive 2019/771 legal guarantee | 2 years of free repair, replacement or refund for a faulty item (EU, 2019) |
| 55 | "FedEx then left my $619 order at someone else's door" (14 Nov 2026, Trustpilot) | Amazon A-to-z Guarantee for undelivered parcels | 48 hours from first contact to resolution (Amazon) |
| 56 | "Neither phone number connects to anyone, and email support replies about once a day..." (14 Nov 2026, Trustpilot) | Chewy 24/7 phone, email and live chat (Form 10-K) | Under 10 seconds to answer a phone call, 24 hours a day (Chewy) |
| 57 | "after being forced to send them a video of the failure, upload logs, etc..." (14 Aug 2026, Trustpilot) | Memfault remote diagnostics from devices in the field | 19% lower customer support cost (Memfault) |
| 58 | "they want me to pay $80 for the inspection plus $40 shipping ($120 upfront)." (29 Sep 2026, Trustpilot) | Back Market Express Replacement, no hold or deposit | $0 paid and $0 held for a warranty replacement (Back Market) |
| 59 | "...the G1 model I purchased had been discontinued days after shipment..." (30 Mar 2026, Trustpilot) | Framework Laptop 13: every mainboard fits the original chassis | Every mainboard generation fits the original chassis (Framework) |
| 60 | "they shipped me an empty box" (9 Jul 2026, Trustpilot) | ColdTrack scanned picking with a pack accuracy guarantee | 99.9% pack accuracy (ColdTrack) |
| 61 | "Nose bridge snapped at 7 months... both arms on the NEW pair are peeling apart." (28 Oct 2026, Trustpilot) | ISO 12870:2024 frame standard; a sunglasses maker's 2-year frame warranty | 2-year frame warranty; no measured failure rate found |
| 62 | "in a sunny day impossible to see" (17 Aug 2026, Trustpilot) | A display-glasses maker rates its display at 6,000 nits peak | 6,000 nits peak (maker's rating) |
| 63 | "Instead, they refused to take responsibility, stating that their warranty does not cover accessories." (15 Aug 2026, Trustpilot) | Peak Design lifetime warranty including accessories | Lifetime warranty on accessories (Peak Design) |
| 64 | "I was never told my glasses would be made and shipped from China." (10 Nov 2026, Trustpilot) | EU GPSR Article 19: manufacturer address on every listing | None published (rule: manufacturer address on 100% of listings) |
| 65 | "...nearly 3 months after i initially sent them for a 'repair'" (7 Apr 2026, Trustpilot) | Back Market Express Replacement, next-business-day shipping | 3 business days from approval to replacement in hand (Back Market) |
| 66 | "the focal point on the progressive lenses is far too narrow..." (23 Jun 2026, Trustpilot) | A lens maker's progressive lens series, tested on 73 wearers | 69 of 73 wearers (95%) adapted on day one |
| 67 | "their checkout never actually captured the +/- sign of the prescription" (6 Jun 2026, Trustpilot) | Optical retailers check prescriptions by upload or with the doctor, and remake wrong lenses free | None published (rule: $0 to remake a wrong lens) |
| 68 | "a week sitting on my order while asking me questions relating to my prescription..." (18 Nov 2026, Trustpilot) | US FTC Contact Lens Rule passive verification | 8 business hours to verify a prescription (US FTC) |
| 69 | "the ring has no durability and shattered when clapping" (4 Oct 2026, Trustpilot) | Samsung Galaxy Ring titanium body, IP68 | None published (100 m water rating is the only measured figure) |
| 70 | "The price displayed on your website was significantly lower than the amount shown at checkout" (25 Feb 2026, Trustpilot) | UK DMCC Act 2024 drip-pricing ban | $0 between the first price shown and the price charged (UK, 2024) |
| 71 | "Prescription orders can't be cancelled after 24 hours, but some customers are reporting..." (9 Feb 2026, Trustpilot) | An online glasses retailer lets buyers cancel until shipping begins | Cancel any time before shipping, no 24-hour cutoff |
| 72 | "...NOW they say it is beyond the return period and offer a 'clip' as reimbursement." (25 Sep 2025, Trustpilot) | EU Sale of Goods Directive two-year claim period | 1 year in which the seller must prove the fault was not there at delivery (EU) |
| 73 | "Without connection with smartphone, it is useless." (2 Aug 2026, Trustpilot) | Apple Watch with cellular works away from the iPhone | None published |
| 74 | "...their technical team believed the issue was 'most likely caused by battery swelling'" (6 Aug 2026, Trustpilot) | Apple iPhone 15 and later charge limit, set from 80% to 100% | 80% capacity after 1,000 cycles (Apple); no measured swelling rate found |
| 75 | "...they would 'restrict access to the Even Realities App' if I didn't comply." (9 Feb 2026, Trustpilot) | An open-source companion app runs the G1 without the vendor app or an account | 0 vendor accounts needed to use the glasses |
| 76 | "...I was charged $57 immediately for the first month. After that, basically nothing happened." (7 Oct 2026, Trustpilot) | Amazon charges when the order ships | $0 charged before shipment (Amazon) |
| 77 | "They refuse to ship to military addresses and will attempt to charge you additional fee's..." (23 May 2026, Trustpilot) | USPS delivery to APO, FPO and DPO addresses at domestic prices | Domestic postage price to a military address (USPS) |
| 78 | "...I didn't want my order cancel I just want to change my payment method" (14 May 2026, Trustpilot) | US FTC Mail Order Rule refund deadline | 7 working days to refund (US FTC) |
| 82 | "The charging case makes a high-pitched whistling sound..." (10 Feb 2026, Trustpilot) | MPS audible-noise design methods: move resonance above 20 kHz | None published (design target: resonance above 20 kHz) |
| 84 | "No headphones / bone transducers." (5 Feb 2026, Trustpilot) | A display-glasses maker builds in two open-ear speakers | 2 open-ear speakers; no measured loudness found |
| 86 | "In regular use, the device feels slow and unresponsive, with noticeable lag between interactions." (7 Jan 2026, Trustpilot) | A mixed-reality headset's see-through display latency, measured by OptoFidelity | 11 ms measured display latency (OptoFidelity) |
| 90 | "4 star because there are no camera." (27 Jul 2026, Trustpilot) | A display-glasses maker's 12 MP ultra-wide camera | 12 MP camera on display glasses |
| 95 | No quote found in the raw files (18 Mar, year not shown, App Store) | A display-glasses maker shows the phone's playing music as a live activity | None published |
| 99 | "Would you guys consider adding different colors to the display itself instead of green?" (21 Nov 2026, X) | A display-glasses maker's full-color MicroLED waveguide display | Full color at 6,000 nits peak (maker's rating) |
| 105 | "The prescription version has a major issue. Humidity/moisture." (22 Jun 2026, X) | Industrial smart glasses rated IP67 | IP67 rating |
| 106 | "the glasses' coating peeled off" (tr) (17 Nov 2026, X) | A lens maker's premium UV lens coating | Bayer ratio 16 |
| 107 | "I kept failing and getting irritated" (tr) (16 Nov 2026, X) | Slide-on nose pads: three steps, no tools | None published |
| 108 | "...wouldn't it be best if the ring could be stored inside the glasses case..." (6 Jul 2026, X) | Oura Charging Case, up to five ring charges | 5 full ring charges in a pocket case (Oura) |
| 109 | "wiping with alcohol is forbidden" (tr) (19 Nov 2026, X) | Apple allows 70% isopropyl alcohol wipes on its displays | 70% isopropyl alcohol allowed on the display (Apple) |
| 110 | "it looks like it could ruin my eyes" (tr) (17 Nov 2026, X) | A display-glasses maker's TÜV Rheinland Eye Comfort 5 Star certification | TÜV Rheinland Eye Comfort 5 Star; no measured values published |
| 111 | "after upgrade, all apps are gone. even hub is unreachable." (10 May 2026, Google Play) | Cloudflare Business SLA, 100% content serving | 100% uptime under a written SLA (Cloudflare) |
| 112 | "release was delayed about a month" (tr) (7 May 2026, X) | Apple App Review timing, expedited review and an appeals board | 90% of submissions reviewed in under 48 hours (Apple) |
| 113 | "paid apps on Even Hub should be allowed right away" (tr) (11 Apr 2026, X) | Epic Games Store revenue share: developer keeps the first $1M | 100% of the first $1M per app per year to the developer (Epic Games Store) |

## Business potential and safety

- **Who pays.** Even's CEO says one third of users are company executives and that users wear G2 8 to 10 hours a day (interview, Silicon Valley Investclub, 31 Aug 2026). An executive's day is meetings; messages wait on the phone. Gloz answers them from the glasses.
- **Demand.** Owners ask in public reviews to reply from the glasses, to read their own scripts, for bigger text and for a silent way to answer. Gloz does each.
- **Launch in Even Hub.** The app is a standard Even Hub package ([app/app.json](app/app.json), `gloz.ehpk` built in CI): name without "Even", system exit dialog on double tap at the root, setup message on the glasses before pairing, setup remembered, only the permissions it uses (network to its own backend, glasses microphone, and location only while Navigation or the Dashboard is open).
- **Cost.** Gloz is free and MIT licensed. The backend's cost is the AI provider's price per draft: <!-- gen:cost -->
at most $0.00282 with gpt-4.1-mini (at least 354 drafts for $1) or $0.0235 with Claude Sonnet 4.5, at OpenRouter's list prices of 2026-11-25 (`node eval/cost.mjs`).
<!-- /gen --> With no key, Gloz still works with fixed holding replies.
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
| Gloz server | OpenAI (only if Whisper is not installed and an OpenAI key is set) | your voice while you hold, to turn it into text | when you hold |

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
