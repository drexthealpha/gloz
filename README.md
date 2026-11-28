<!-- gen:first -->**Gloz lets the executive who wears Even G2 all day read and answer every message without the phone, in their language, at their size.** In the Even Hub simulator, plain G2 text showed 0 of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew; Gloz showed 84. Gloz won 10 of 10 scripts, and cut the modelled median time from message seen to reply sent (published operator times, not timed people) from 2.6 s to 2.1 s.<!-- /gen -->

[![CI](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml/badge.svg)](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml) [![live demo](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/drexthealpha/gloz/status/status.json)](https://drexthealpha.github.io/gloz/)

**Try it now, no install, no sign-in:** https://drexthealpha.github.io/gloz/ (the glasses) and https://drexthealpha.github.io/gloz/phone/ (the phone screens; any 6 digits pair there) · **Video, <!-- gen:video -->129 s<!-- /gen -->, in the Even Hub simulator:** https://drexthealpha.github.io/gloz/gloz-demo.mp4 · **Package:** [gloz.ehpk](https://github.com/drexthealpha/gloz/releases/latest/download/gloz.ehpk)
Click to tap, scroll to swipe, hold to speak, double click to close. "Cut the signal" shows a reply waiting through a drop. The replies there were drafted ahead of time by an AI model (Claude) under Gloz's own draft rules; paste your own OpenRouter key on the page for live drafts.

## How it works on the glasses

One thing on the glasses at a time: who wrote, one line of what they said, and the reply Gloz drafted under it. Nothing to press until you want to send.

| You | Gloz |
|---|---|
| nothing | a new message arrives with its reply already drafted: 0 inputs |
| tap, or the ring | sends the reply on screen, in the sender's language; for 2 s swipe up takes it back (undo) |
| double tap on a reply | the next of up to three AI replies ("2/3"), for example yes, not now, or a question back |
| swipe up on a reply | the whole message, line by line; tap brings the reply back |
| hold, say a few words, let go | writes a new reply from what you said; it still waits for your tap |
| say "send" while holding | sends the reply on screen |
| hold on "No new messages" and ask | a one-line answer from your picked chats, for example "what did Sam say about Friday?" |
| swipe down | skips to the next message; a skipped one stays unread on your phone |
| swipe up | back a line, or from the reply back to the message; on the empty screen, brings skipped messages back |
| double tap on a message | closes Gloz (the glasses ask first) |
| R1 ring | the same presses as the touchpad: tap, double tap, hold, and scroll for swipe up or down, so every screen works from the ring alone |
| glasses menu | bigger or smaller text, move the line, translate, mute a chat, check now, listen to the room, unmute all |
| Listen to the room | captions of the conversation around you, in your language; tap pauses the microphone, swipe up goes back to any earlier line; the transcript is on the phone to copy or share |
| phone, Chats on the glasses | pick the chats you want; with any picked, only those reach the glasses |
| phone, Quiet hours | new messages wait until the hour you pick (22:00 to 07:00, say), then all come at once; check now still shows them |

Past the last message is your day (meetings, tasks, weather and more, each a line): [docs/BEYOND-MESSAGES.md](docs/BEYOND-MESSAGES.md).

Nothing is sent without your tap or your word. Text is drawn as an image with the phone's own fonts, so Arabic, Persian, Hindi, Thai and Hebrew show on the glasses, at the size you pick (7 sizes; the largest fills the whole display). A reply written in a language you do not read is shown to you by its meaning. Replies wait in a saved outbox through any drop and go out when the link is back.
The phone page follows your language too: Arabic, Persian, Hindi, Thai, Hebrew, Japanese, Korean, Chinese and Russian, right to left where the script is ([app/public/lang](app/public/lang); translated by Claude, not yet reviewed by native speakers).

Messages come from **Telegram (your account or a bot), Slack, Discord and Gmail**, straight from each service to Gloz's own server, so Gloz needs no access to the phone's notifications. Drafts come from **Claude, ChatGPT or any OpenRouter model** on your own key, or NEAR AI in the public demo. Speech to text runs on Gloz's own backend (Whisper; [its languages](https://github.com/openai/whisper#available-models-and-languages)), and replies are drafted in the language of the message. The backend holds every key; the glasses app holds only a pairing token. Each connector is tested against the service's documented replies with no keys ([test/connectors.test.mjs](test/connectors.test.mjs)); a run on live accounts needs your own keys in `.env`.

## For judges: where to look

**Track:** 01 Messaging & News (main) and 04 AI Assistants & Work.

| Criterion | Where to look |
|---|---|
| Usefulness on G2 · 30% | The live demo, then [the held-out results](#results): plain G2 text drops Arabic, Persian, Hindi, Thai and Hebrew; Gloz shows them, drawn as images in the phone's own fonts (<!-- gen:Ldraw -->[app/src/render.ts#L88](app/src/render.ts#L88)<!-- /gen -->), with the phone in the pocket. Who it is for: [Business potential](#business-potential-and-safety). |
| Read and write · 25% | In the live demo, paste your own OpenRouter key under the glasses and each reply is drafted live by AI (the key stays in your browser tab and goes only to OpenRouter). The reply arrives drafted, one tap sends it: <!-- gen:Lsend -->[app/src/core/flow.ts#L97](app/src/core/flow.ts#L97)<!-- /gen --> (every press, tested in <!-- gen:Ltap -->[test/core.test.ts#L23](test/core.test.ts#L23)<!-- /gen -->); drafts with no long dictation: <!-- gen:Ldraft -->[server/ai.mjs#L86](server/ai.mjs#L86)<!-- /gen -->; time from message seen to reply sent: <!-- gen:Ltime -->[eval/time.mjs#L16](eval/time.mjs#L16)<!-- /gen -->. |
| Technical execution · 20% | <!-- gen:tests -->183 tests in 33 files, all run on every push; they cover 73.58% of lines, 74.73% of branches and 72.79% of functions (`node scripts/coverage.mjs`, checked in CI): [pass log](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml)<!-- /gen -->. Real services, no stand-ins in the app: <!-- gen:Lconn -->[server/connectors.mjs#L235](server/connectors.mjs#L235)<!-- /gen -->. Replies sent once even when retried: <!-- gen:Lonce -->[server/app.mjs#L256](server/app.mjs#L256)<!-- /gen -->. Outbox: <!-- gen:Loutbox -->[app/src/core/outbox.ts#L27](app/src/core/outbox.ts#L27)<!-- /gen -->. Tests with no keys and the evaluation in the Linux simulator run on every push: [CI](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml). Setup checked by `npm run check:setup`. |
| UX for display and voice · 15% | One line on the glasses, drawn at the wearer's size: <!-- gen:Llayout -->[app/src/render.ts#L32](app/src/render.ts#L32)<!-- /gen -->, <!-- gen:Lmove -->[app/src/glasses.ts#L113](app/src/glasses.ts#L113)<!-- /gen -->. Every screen says what a press does. Voice: hold, speak, let go; one word acts. The phone screens are built with shadcn/ui: <!-- gen:Lphone -->[app/src/phone/PairScreen.tsx#L10](app/src/phone/PairScreen.tsx#L10)<!-- /gen -->, live at https://drexthealpha.github.io/gloz/phone/. |
| Business potential and safety · 10% | [Business potential and safety](#business-potential-and-safety): who pays, what it costs, what is stored (nothing after sending: <!-- gen:Ldrop -->[server/app.mjs#L91](server/app.mjs#L91)<!-- /gen -->), what is never sent without the wearer. |

## The page's rules, word for word, and how Gloz meets each

Quoted from the Heads Up page (read 27 Nov 2026).

| The page says | Gloz |
|---|---|
| "It shows one thing that matters, then lets you act on it in seconds" | One card at a time: who wrote, one line of what they want, and the reply drafted under it. The AI puts the most pressing message first. |
| "We call this read and write, and it is what we judge first." | The reply is on the card when the message arrives (0 inputs); one tap or the ring sends it, with 2 s to take it back. |
| "When the user switches away, it cannot show anything or pop up alerts." | Gloz shows nothing while you are in another app. Messages wait on the Gloz server, and when you come back the most pressing one is first. |
| "External calls must be whitelisted in app.json and pass CORS." | The glasses app calls one origin, your Gloz server, listed in [app/app.json](app/app.json); the server answers every call with CORS headers, and every call needs the pairing token. |
| "Google sign-in does not work inside the WebView." | No sign-in happens on the glasses: you pair with a 6-digit code. Google (for the meeting card) is signed in once on the server, in the phone's own browser. |
| "we judge how production-ready an app is" | Every push runs the tests in CI, with coverage; replies wait in a saved outbox through any drop and go out once; a failed send says so. |
| "say in your README what existed before Nov 23." | [What existed before Nov 23](#what-existed-before-nov-23), below. |
| "Never commit API keys or secrets." | Keys live only in the server's environment; `.env` is ignored by git, and CI fails on anything shaped like a key in a tracked file. |
| "A demo video of up to 3 minutes, running in the simulator or on G2." | The video is in the simulator, under 3 minutes. |

## Which AI writes the drafts

The public demo drafts with **NEAR AI**, model Qwen 3.6 35B, which NEAR runs attested inside its own secure hardware ("verifiable" in [NEAR AI's model list](https://cloud-api.near.ai/v1/model/list)). Its data policy: [NEAR AI privacy policy](https://near.ai/?p=10812) and [terms](https://near.ai/terms-of-service). The demo's credit is fixed: one model call per message at most, 400 tokens at most, the same question never paid twice, and when the credit is used up the demo stops calling NEAR and drafts the holding reply.

On your own server, with your own key, pick **Claude**, **ChatGPT** or **OpenRouter** (`GLOZ_ANTHROPIC_KEY`, `GLOZ_OPENAI_KEY` or `GLOZ_OPENROUTER_KEY`); their data policies: [Anthropic](https://www.anthropic.com/legal/privacy), [OpenAI](https://openai.com/policies/privacy-policy/), [OpenRouter](https://openrouter.ai/privacy).

## Results

Locked evaluation: the protocol and the 200 held-out messages were committed before the first run ([eval/PROTOCOL.md](eval/PROTOCOL.md), [eval/set/heldout.json](eval/set/heldout.json)): locked 23 Nov 11:19, first held-out run 23 Nov 14:00. The public history was squashed on 23 and 24 Nov to remove private files, so main no longer shows those two commits; changes made on the dev set are written in the protocol with the reason, before any held-out run. Both arms run in the Even Hub simulator. Plain G2 text is one firmware text container, the way any plain app shows a message; Gloz is the same message drawn by Gloz at size 3, the usual size (6 sizes when the protocol was locked; 7 now). A reader (Tesseract OCR) reads each screen; the primary score is how much blur, standing for weaker eyesight, a message survives before it is lost.

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

Time from message seen to reply sent, 200 held-out messages, from a timing model (published operator times for reading, tapping and speaking; no people were timed):

<!-- gen:time -->
| Arm | Modelled median seconds, message seen to reply sent |
|---|---|
| Plain G2 text, reply spoken in full | 2.6 |
| Gloz, draft read, one tap | 2.1 |

Gloz faster on 160 of 200 messages. Silent reply rate with Gloz: 91 words a minute (median). Data per message, the message, its draft and the send: 0.4 KB (median). Drafts by: default. Protocol: eval/PROTOCOL.md (Time, amendment 3).
<!-- /gen -->

Start to first line: <!-- gen:firstline -->2.2 s from page start to the first line on the glasses in the simulator (budget 5 s, read 2026-11-27)<!-- /gen --> (`node eval/run.mjs heldout --first-line`; every CI simulator run fails above the budget, and `node eval/time.mjs --check` fails a build over 10% slower or heavier per message than the results above).

### Against the best measured elsewhere, per criterion

<!-- gen:crit -->
| Criterion | Best measured elsewhere | Gloz | Where Gloz stands |
|---|---|---|---|
| Usefulness on G2 (30%) | [6.69 s median per notification glance on Apple Watch, filmed in real use](https://link.springer.com/chapter/10.1007/978-3-319-58637-3_22) | 2.1 s from message seen to reply sent, phone in the pocket, modelled from published operator times | different measure: Gloz is modelled, not timed on people |
| Read and write (25%) | [12% of mobile replies sent from a suggestion (Google Smart Reply)](https://research.google/blog/efficient-smart-reply-now-for-gmail) | a reply ready under 200 of 200 messages, sent with 1 taps; 91 words a minute, silent (modelled) | different measure: the share of replies sent from a draft is not measured on people |
| Technical execution (20%) | [99.99% crash-free sessions, top apps (Luciq 2025)](https://www.luciq.ai/mobile-app-stability-outlook-2025) | 200 of 200 messages got a reply with every AI provider failing; 0 of 20 stray presses sent anything | not measured on users: no crash figures from real use yet |
| UX for display and voice (15%) | no published figure for reading on a display like G2's | 84 of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew shown, against 0 with plain G2 text (simulator) | no number to beat |
| Business potential and safety (10%) | [0 message content handed over under legal process (Signal)](https://signal.org/bigbrother/cd-california-grand-jury/) | 0 of 200 message texts on the server's disk after sending | matched on message content |
<!-- /gen -->

Run it yourself: `npm run eval` (needs the simulator), `npm run eval:time`, `node eval/score.mjs`. Method and limits: [eval/PROTOCOL.md](eval/PROTOCOL.md).

## Complaints Gloz fixes

Every complaint from public reviews that a glasses app can act on: what owners said, what Gloz does, Gloz's measured number, the best measured anywhere today, and the result. "Gloz ahead" means Gloz's number is better on the same measure. Numbers come from `node eval/complaints.mjs`, `npm run eval:time` and the evaluation above.

<!-- gen:wins -->
| What G2 owners asked for | What Gloz does | Gloz | Best elsewhere | Result |
|---|---|---|---|---|
| "the size of the font ... can be customized" (12 Aug 2026, Trustpilot) | Seven text sizes, drawn as images; the largest fills the whole display, a few letters at a time. Pick one on the phone or from the glasses menu. | largest text 8.81 times the glasses' own text | [largest body text 53 pt, 3.1 times the default (iOS Dynamic Type)](https://developer.apple.com/design/human-interface-guidelines/typography), read 2026-11-23 | Gloz ahead |
| "A third of the display ... constantly displaying date and time" (13 Jul 2026, App Store) | Your day, dashboard: you pick what fills the display, up to 12 panels (time, mail, next events, tasks, weather, a pinned note); hold on the glasses to choose. | 12 panels you pick on one screen, each up to 28 characters, none under 20 px | [8 slots you pick on one watch face (Apple Watch Infograph)](https://www.macrumors.com/2018/10/01/apple-watch-series-4-infograph-face/), read 2026-11-23 | Gloz ahead |
| "a pause gesture for Conversate directly on the glasses or ring" (27 Oct 2026, App Store) | In Listen to the room: one tap pauses (the microphone turns off), one tap goes on; swipe up reaches any earlier line. | 1 tap to pause or go on; every earlier line reachable (yes) | [1 tap on the worn device to stop or restart, then back 10 s at most (watch control of live captions)](https://support.apple.com/guide/watch/apd4f5b634f3), read 2026-11-23 | Gloz ahead |
| "Pro Mode used up all its credits in one 2-hour meeting (tr)" (21 Nov 2026, X) | Listen to the room has no credits and no time limit; with Whisper on the Gloz server it costs nothing per minute. | no limit (60 hours tested), $0 a month with Whisper on the server | [4 hours per conversation, $19.99 a month (Otter.ai Business)](https://otter.ai/pricing), read 2026-11-23 | Gloz ahead |
| "there seems to be a character limit (tr)" (20 Nov 2026, X) | Long messages are paged line by line. Nothing is cut. | 2,000,000 of 2,000,000 characters kept | [up to 1.02 million characters in one document (Google Docs)](https://support.google.com/drive/answer/37603), read 2026-11-23 | Gloz ahead |
| "every time I say "Even AI" the Bluetooth gets disconnected" (31 Mar 2026, Google Play) | No wake word. Gloz listens only while you hold the touchpad or ring. | 0 false wake-ups: nothing listens until you hold | [2.7% missed, at 1 false wake-up per 10 hours](https://github.com/Picovoice/wake-word-benchmark), read 2026-11-23 | matched |
| "sometimes directly log out without doing anything" (12 Jan 2026, Google Play) | Gloz pairs once and never signs out a glasses app in use. Only a pairing unused for 90 days ends. | 365 days of daily use on a test clock, 0 forced sign-ins | [6 months without a forced sign-in](https://developers.google.com/identity/protocols/oauth2), read 2026-11-23 | matched |
| "why the display glass is so off to the top" (12 Nov 2026, X) | The line sits in the middle, or lower if you pick Low. | line centred, or 64 px lower | [image centred on straight-ahead gaze](https://arxiv.org/html/2505.09047v1), read 2026-11-23 | matched |
| "let Siri AI be accessed as an alternative" (9 Oct 2026, App Store) | The backend owner picks the model: any OpenRouter model, Claude or ChatGPT. | every OpenRouter model (469 listed on 2026-11-25), plus Claude and ChatGPT directly | [469 models behind one key (OpenRouter)](https://openrouter.ai/api/v1/models), read 2026-11-25 | matched |
| "the app does not currently support the Russian language" (6 Nov 2026, App Store) | Text is drawn as images with the phone’s own fonts, so scripts the glasses lack still show. | 84 of 100 held-out Arabic, Persian, Hindi, Thai and Hebrew messages shown; plain G2 text 0 of 100 | [150+ writing systems](https://fonts.google.com/noto), read 2026-11-23 | matched |
| "The connection with my calendar seems to constantly get lost" (10 Feb 2026, Trustpilot) | Gloz pairs once and stays connected while in use; the backend holds the service tokens. | 365 days of daily use on a test clock, 0 forced sign-ins | [6 months without a forced sign-in](https://developers.google.com/identity/protocols/oauth2), read 2026-11-23 | matched |
| "activate randomly without you activating them" (20 Sep 2025, Trustpilot) | Nothing listens until you hold. Nothing sends until the reply is on screen and you tap. | 0 sends from 20 single presses; 0 false wake-ups | [1 false activation per 10 hours](https://github.com/Picovoice/wake-word-benchmark), read 2026-11-23 | matched |
| "select terminal mode or any feature from the menu" (29 Apr 2026, App Store) | Every tool opens from the glasses: hold on your day list and say it (for example "server"), or swipe to it and tap. | 1 hold and a word, phone not touched | [1 gesture, phone not touched](https://www.meta.com/help/ai-glasses/764536076119235/), read 2026-11-23 | matched |
| "Captions sometimes appear with noticeable delays" (16 Nov 2026, App Store) | Listen to the room: captions of the conversation in your language, from 4-second pieces of sound. | about 6.8 s from words spoken to caption (Whisper on the Gloz server) | [130 ms to first caption](https://artificialanalysis.ai/articles/new-streaming-speech-to-text-benchmark-aa-wer-streaming), read 2026-11-23 | not beaten |
| "Prices are delayed or flat-out wrong" (12 Sep 2025, Trustpilot) | Stocks: the tickers set on the Gloz server, each price with its time and its change today. | free quotes, each with its time; real prices need a free Finnhub key | [6.1 µs median feed latency](https://databento.com/blog/worlds-fastest-cloud-ticker-plant), read 2026-11-23 | not beaten |
| "low touch sensitivity, making scrolling difficult" (4 Mar 2026, Google Play) | A reply goes out only when it is on screen and you tap. A swipe back undoes a swipe. | 0 of 20 single presses sent a reply not on screen | [over 90% gesture accuracy for new users](https://repository.cshl.edu/id/eprint/42049/1/10.1038.s41586-025-09255-w.pdf), read 2026-11-23 | different measure |
| "the option to change the display timeout is no longer there" (7 May 2026, Google Play) | Each press means the same on every Gloz screen. Six actions in the glasses menu. | no number | [0.88 gestures a second](https://repository.cshl.edu/id/eprint/42049/), read 2026-11-23 | different measure |
| "why can we not reply to a text message??" (21 May 2026, Google Play) | Each message arrives with its reply drafted under it. One tap sends it. | 91 words a minute sent, silent (fixed holding replies; AI drafts need a key) | [20.9 words a minute, silent](https://repository.cshl.edu/id/eprint/42049/), read 2026-11-23 | different measure |
| "AI summary comes out in English (tr)" (26 May 2026, App Store) | Replies are written in the sender’s language; their meaning is shown in yours. | 200 of 200 replies in the sender’s language (fixed holding replies; AI drafts need a key) | [99.2% of the English score in Japanese](https://platform.claude.com/docs/en/build-with-claude/multilingual-support), read 2026-11-23 | different measure |
| "you need programming expertise to get keys and secrets" (10 Oct 2026, App Store) | The wearer types no key. Keys live on the backend; the glasses pair with a 6-digit code. | 0 keys typed by the wearer | [850 million weekly store users](https://www.apple.com/newsroom/2026/06/app-store-ecosystem-reaches-1-point-4-trillion-usd-as-developers-thrive-globally/), read 2026-11-23 | different measure |
| "The syncing is extremely unreliable" (21 Oct 2026, App Store) | Server: runs only the commands its owner allows on the Gloz server and shows the output a line at a time. | one screen of output per press; not measured per keystroke | [under 5 ms keystroke response](https://www.usenix.org/conference/atc12/technical-sessions/presentation/winstein), read 2026-11-23 | different measure |
| "when it sends EVERYTHING to the AI (tr)" (16 Jun 2026, Google Play) | Message text lives only in the backend’s memory and is dropped once the reply is sent. Open source. | 0 of 200 message texts written to disk; 0 kept after sending | [$1,000,000 top security bounty](https://security.apple.com/blog/pcc-security-research/), read 2026-11-23 | different measure |
| "a half baked product for a fully baked price" (29 Jul 2026, App Store) | Gloz adds the message job to glasses already owned. Free, MIT licence. | $0 | [$799 for display glasses with an input band](https://www.meta.com/blog/meta-ray-ban-display-ai-glasses-connect-2025/), read 2026-11-23 | different measure |
| "If you start Conversate from the R1 ring it quits early" (5 Feb 2026, Trustpilot) | Listen to the room keeps going until you stop it from the glasses menu. | 54000 of 54000 pieces kept over 60 hours (logic test, not a recording) | [50 hours of continuous recording](https://www.plaud.ai/pages/compare-plaud-devices), read 2026-11-23 | different measure |
| "access to a kindle reader" (19 Jul 2026, App Store) | Reader: your own long texts from Notion or Google Docs, a line at a time at reading pace. | 2,000,000 characters paged, every one reachable (test/modes-reader.test.mjs) | the e-book app itself at 1920 x 1080 | different measure |
| "Translate does not detect the language" (13 Sep 2026, press) | For messages, the language comes from the text; nothing to set. | 0 languages set by the wearer | [60+ spoken languages found automatically](https://soniox.com/blog/soniox-v5-real-time), read 2026-11-23 | different measure |
| "only have a voice input" (13 Nov 2026, X) | Reply with one tap and no voice. | 91 words a minute sent, silent (fixed holding replies; AI drafts need a key) | [20.9 words a minute, silent](https://repository.cshl.edu/id/eprint/42049/1/10.1038.s41586-025-09255-w.pdf), read 2026-11-23 | different measure |
| "Only walking or cycling navigation" (1 Nov 2026, App Store) | Directions: hold and say where; walking steps a line at a time, from free OpenStreetMap routing with no account. | built; arrival time not measured | [accurate arrival time on 97% of trips](https://blog.google/products-and-platforms/products/maps/google-maps-101-how-ai-helps-predict-traffic-and-determine-routes/), read 2026-11-23 | not measured |
| "The route does not automatically update" (4 Apr 2026, Google Play) | Directions works the route out again when the phone moves more than 40 m off it. | built; not measured on the same test | [75% fewer wrong-side-of-street positions](https://android-developers.googleblog.com/2020/12/improving-urban-gps-accuracy-for-your.html), read 2026-11-23 | not measured |
| "responds that it can’t help me" (1 Oct 2026, App Store) | Ask: hold on your day list and say a question; the answer shows a line at a time. | built; real answers need an AI key on the Gloz server | [Arena text score 1507](https://arena.ai/leaderboard/text), read 2026-11-23 | needs a key |
| "it shows different images in the left and right eyes" (3 Apr 2026, Google Play) | Teleprompter (say "prompter"): your script one line at a time; a tap starts following your voice, another tap pauses. | 59.4% of updates on the exact word, 93.1% within one word: 2 people reading books aloud (LibriSpeech test-clean, 1200 words), heard by Whisper base on the Gloz server; word times from Whisper on each whole sentence | no measured number found for a teleprompter that follows the voice | no number to beat |
| "without it coming back <30s later" (26 Sep 2026, Google Play) | Messages come straight from Telegram, Slack, Discord and Gmail. One you answered or skipped does not come back. | 0 messages shown twice (test/core.test.ts) | no measured number found | no number to beat |
| "sometimes fail with a "server error"" (6 Feb 2026, Google Play) | If one AI provider fails, the next is tried. If every one fails, a short reply in the sender's language is still ready to send. | 200 of 200 messages had a reply ready with every AI provider failing (600 failed calls) | no measured number found for drafting with every AI provider down | no number to beat |
| "the translation stops working whenever the app detects the target language" (29 Jul 2026, Google Play) | For messages: Translate shows every message in your language; the reply goes out in the sender’s language with its meaning shown to you. | built for messages; not measured without an AI key | no measured number found | no number to beat |
| "we need to be able to share a transcript directly" (25 Mar 2026, Google Play) | The last conversation shows on the phone screen with Copy and Share. | built; no number | no measured number found | no number to beat |
| "The text jumping ... frequently causes severe dizziness" (24 Jul 2026, Trustpilot) | One line at a time. A line, or a caption, never changes while it is shown; the next one replaces it whole. | 0 of 54000 shown captions changed afterwards (0%) | [no published share of caption words that change (Google live-caption stabilization, 2023)](https://research.google/blog/modeling-and-improving-text-stability-in-live-captions/), read 2026-11-23 | no number to beat |
| "the lack of apple health, maps, and even note integration" (7 Aug 2026, Trustpilot) | Notes from Notion or Google Docs: read them on the glasses, or say a new one. | built | no measured number found | no number to beat |
| "No instructions are available for any apps." (10 Oct 2026, App Store) | Every Gloz screen says what a tap, hold or swipe does there. | 0 of 7 screens without a press hint | no measured number found | no number to beat |
| "forced to see the news" (14 May 2026, Google Play) | Gloz shows only the chats you keep; "Mute this chat" in the glasses menu removes one. | no number | no measured number found | no number to beat |
| "looses internet connection more than often" (6 May 2026, App Store) | Replies wait in a saved outbox through any drop and go out when the link is back; the line says how many wait. | 0 replies lost after a drop and an app restart (test/core.test.ts) | no measured number found | no number to beat |
| "put tasks in the dash via API" (12 Nov 2026, X) | Tasks from Google Tasks or Notion: mark one done, or say a new one; they show on your day list. | built | no measured number found | no number to beat |
| "There is no voiceprint recognition/isolation" (24 Jul 2026, Trustpilot) | Telling speakers apart: not built. | none | [11.2% diarization error rate](https://arxiv.org/html/2509.26177v1), read 2026-11-23 | not built |
| "Conversate relies on limited Prep Notes" (11 Sep 2026, Trustpilot) | Documents in live conversation: not built. | none | [600 sources of up to 500,000 words](https://support.google.com/notebooklm/answer/16213268), read 2026-11-23 | not built |
| "not good at emotional signals" (3 May 2026, Trustpilot) | Tone of a spoken conversation: not built. | none | [77.6% accuracy on IEMOCAP](https://arxiv.org/pdf/2609.20081), read 2026-11-23 | not built |
| "it couldn’t remember anything or recall" (14 Jul 2026, X) | Memory across conversations: not built. Drafts see the last 8 messages of the chat. | none | [96.4% on LongMemEval](https://www.prnewswire.com/news-releases/exabase-achieves-state-of-the-art-on-beam-memory-benchmark-at-every-scale-using-a-smaller-cheaper-model-302835412.html), read 2026-11-23 | not built |
<!-- /gen -->

## For Even Realities: five requests for the SDK

1. **Stay connected and reconnect alone.** Best today: the phone OS wakes the companion app when the paired device comes back in range (Android Companion Device Manager presence, iOS Bluetooth state restoration).
2. **Login that works offline and never logs out.** Best today: local features with no account; sign-in valid until six months unused (Google OAuth refresh tokens); passkeys, 93% sign-in success (FIDO Passkey Index, 15 Oct 2026).
3. **No phone drain when the glasses are away.** Best today: OS presence events instead of constant scanning; Google Play flags apps where over 5% of sessions hold more than 2 hours of wake locks a day.
4. **Plugin access to phone notifications.** Best today: Apple Notification Center Service and Android NotificationListenerService. Gloz does not need it (its messages come through its own server); plugins without a server do.
5. **Connection state for plugins.** Best today: the OS tells the companion app on every connect and disconnect.

The 69 complaints only Even Realities can fix (hardware, the Even app, delivery, refunds), each with the best solution today, are in [docs/BEYOND-MESSAGES.md](docs/BEYOND-MESSAGES.md).

## Business potential and safety

- **Who pays.** Even's CEO says one third of users are company executives and that users wear G2 8 to 10 hours a day (interview, Silicon Valley Investclub, 31 Aug 2026). An executive's day is meetings; messages wait on the phone. Gloz answers them from the glasses.
- **Public beta and real use.** Install the beta on G2 from [the latest gloz.ehpk](https://github.com/drexthealpha/gloz/releases/latest/download/gloz.ehpk), or try it in the browser at [drexthealpha.github.io/gloz](https://drexthealpha.github.io/gloz/). ![installs](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdrexthealpha%2Fgloz%2Fstatus%2Fusage.json) counts the downloads of the package since 27 Nov 2026 as GitHub records them (before that, Gloz's own hourly check downloaded it, so those are left out: [eval/usage-baseline.json](eval/usage-baseline.json)). Anyone can inflate a download count, so it is not proof of use; replies sent are, and they are counted from a hosted Gloz server's log. No hosted server is running yet, so there is no count of replies to show.
- **Demand.** 115 public complaints from G2 owners (App Store, Google Play, Trustpilot, X and the press, read 23 Nov 2026). 44 are ones a glasses app can act on; 69 are about the hardware, delivery or the company (Gloz also helps with one of them, 13, in the app); 2 are about the company's posts. The 45 Gloz acts on are in [Complaints Gloz fixes](#complaints-gloz-fixes) with Gloz's measured result; the 69 have the "Fix my glasses" request. Owners ask to reply from the glasses, for bigger text and for a silent way to answer.
- **Launch in Even Hub.** Gloz is uploaded to Even Hub as `com.drexthealpha.gloz` (build 0.1.2, private until the store review). The listing is in [app/listing](app/listing): name, a 45-character tagline, the description and a 24 x 24 icon, for one `evenhub create` command. The app is a standard Even Hub package ([app/app.json](app/app.json), `gloz.ehpk` built in CI): name without "Even", system exit dialog on double tap at the root, setup message on the glasses before pairing, setup remembered, only the permissions it uses (network to its own backend, glasses microphone, and location only while Navigation or the Dashboard is open).
- **What it costs the wearer today.** Without Gloz, each message means taking out the phone: at 63.5 notifications a day (Pielot et al., MobileHCI 2014) and a median 6.7 s per glance at a watch (wearable-camera study, 2017), about 7 minutes a day of looking down, before replying. With Gloz on your own server: at 100 replies a working day, the AI drafts cost at most about $0.28 a day with gpt-4.1-mini (100 times the most one draft can cost, below). The server runs on any Node 24 host.
- **Plan (not yet built).** Gloz stays free in Even Hub; the business is a hosted Gloz server for people who do not run their own: **$12 a month** (planned). Its cost at the heaviest use, 100 replies every working day: AI drafts at most $0.28 a day, so $5.92 over 21 working days, plus about $0.10 of a small shared server per person, so about $6 a month and a margin of about 50%; lighter use costs less and the margin is higher.
- **Message text and the AI.** Gloz's server keeps no message text after the reply is sent ([server/app.mjs](server/app.mjs) `drop`, tested in [test/server.test.mjs](test/server.test.mjs)). Its requests to OpenRouter ask only for providers that keep no prompt data (`provider.data_collection: deny`, [server/ai.mjs](server/ai.mjs)); with Anthropic or OpenAI keys, their own API data terms apply.
- **Cost.** Gloz is free and MIT licensed. The backend's cost is the AI provider's price per draft: <!-- gen:cost -->
at most $0.00282 with gpt-4.1-mini (at least 354 drafts for $1) or $0.0235 with Claude Sonnet 4.5, at OpenRouter's list prices of 2026-11-25 (`node eval/cost.mjs`).
<!-- /gen --> With no key, Gloz still works with fixed holding replies.
- **Data.** Message text lives only in the backend's memory and is dropped once the reply is sent: 0 of 200 message texts were written to disk in `eval/complaints.mjs`. Keys stay on the backend. The glasses app stores only the pairing token, settings and the outbox.
- **Money.** Gloz moves no money and gives no financial advice.
- **The people whose messages are shown.** Only chats the wearer picks; "Mute this chat" removes one. Nothing is sent without the wearer's tap or word: a reply needs a tap to show it and a second tap to send it ([test/core.test.ts](test/core.test.ts)), and 0 of 20 single presses sent anything in `eval/complaints.mjs`.
- **Who wrote each reply.** The server records whether the AI or the wearer wrote each reply it sends, by matching the text with the drafts it gave out, never by taking the phone's word (<!-- gen:Lwho -->[server/app.mjs#L266](server/app.mjs#L266)<!-- /gen -->, tested in [test/server.test.mjs](test/server.test.mjs)). Slack gets it in the message metadata and Gmail in an `X-Gloz-Written-By` header ([test/connectors.test.mjs](test/connectors.test.mjs)). The wearer can sign replies "via Gloz" in More settings: off unless turned on, and "via Gloz · AI draft" when the AI wrote it.
- **Keys.** No key is in the app or in the repository: CI fails on anything shaped like a key in a tracked file (`npm run check:secrets`).

### Data policy: what leaves the phone and the server

| From | To | What is sent | When |
|---|---|---|---|
| Glasses app (phone) | your Gloz server only (the one address in [app/app.json](app/app.json)) | pairing token; the reply you approved; your voice while you hold | when you pair, reply or hold |
| Gloz server | Telegram, Slack, Discord, Gmail (only those you set up) | read requests for the chats you picked; the reply you approved | Telegram: a request held open until a message comes, so it arrives at once; the others every 2 s; on send |
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

## Server API

Every route answers JSON. Pair once, then send the token as `Authorization: Bearer <token>` on every other route.

| Route | Does |
|---|---|
| `POST /pair {code}` | the 6-digit code the server prints gives a token |
| `GET /inbox?after=N&lang=en&wait=25` | messages after N, with their translation and summary when AI is on; with `wait`, the answer waits up to 25 s for a message, so one shows the moment it arrives |
| `POST /draft {id, ask?, lang?}` | a reply in the sender's language, its meaning in yours, and up to three to pick from |
| `POST /send {key, id, text}` | sends once per key, however often it is retried; the same key with other text is refused |
| `POST /read {id}` | marks the message read at its service |
| `POST /unpair` | this phone's pairing ends at once |
| `POST /forget` | delete everything: every pairing, message reference, sent record and calendar mark; the phone's Delete everything button calls it and clears the phone |
| `GET /stats` | published from the server's own log, no message text: median time from a message arriving to the glasses having it (target under 2 s), from a send to its confirmation (target under 1 s), replies sent, and the share sent as the AI drafted them |
| `GET /health` | what is set up, and daily and monthly active devices; no message text |

## What existed before Nov 23

- The official Even Hub `minimal` template (Vite, TypeScript, SDK wiring): the starting files of `app/`.
- Libraries: Even Hub SDK <!-- gen:sdk -->0.0.16<!-- /gen -->, CLI 0.2.0 and simulator 0.9.5; Vite; TypeScript; rea (github.com/morluto/rea, MIT License, Copyright (c) 2026 morluto), optional on the server, for "how does ... work" answers; pngjs and tesseract.js for the evaluation. The service APIs of Telegram, Slack, Discord, Gmail, OpenRouter, Anthropic and OpenAI.
- The held-out sentences: Tatoeba (CC BY 2.0 FR).
- Public owner reviews and published best results, gathered before the build.
- Everything else in this repository was written from 23 Nov 2026.

## Licence

MIT. Sample sentences in `eval/set/` are from Tatoeba under CC BY 2.0 FR.

Owner: drexthealpha · reviewed 2026-11-27
