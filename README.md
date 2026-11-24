# Gloz

<!-- gen:first -->
**Gloz lets the executive who wears Even G2 all day read and answer every message without the phone, in their language, at their size.** In the Even Hub simulator, plain G2 text showed 0 of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew; Gloz showed 84. Gloz won 10 of 10 scripts, and cut the median time from message seen to reply sent from 3.0 s to 2.5 s.
<!-- /gen -->

[![CI](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml/badge.svg)](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml) [![live demo](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/drexthealpha/gloz/status/status.json)](https://drexthealpha.github.io/gloz/)

**Try it now, no install, no sign-in:** https://drexthealpha.github.io/gloz/ (the glasses) and https://drexthealpha.github.io/gloz/phone/ (the phone screens) · **Video, 71 s, in the Even Hub simulator:** https://drexthealpha.github.io/gloz/gloz-demo.mp4 · **Package:** [gloz.ehpk](https://github.com/drexthealpha/gloz/releases/download/day-2026-11-23/gloz.ehpk)
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
| glasses menu | bigger or smaller text, move the line, translate, mute a chat, check now, listen to the room |
| Listen to the room | captions of the conversation around you, in your language; tap pauses the microphone, swipe up goes back to any earlier line; the transcript is on the phone to copy or share |

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
| Korean | 1.5 | 4 | 19/20 | 16/20 | yes |
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

Losses, kept here: with no blur, plain G2 text showed more Korean messages (19 of 20 against Gloz's 16) and more Chinese messages (18 against 16) than Gloz; the reader misread some of Gloz's larger glyphs in those two scripts at full sharpness. The first held-out run was thrown away because of a capture fault that favoured Gloz (protocol amendment 4); these are the second run's results, on the code that ships.

One more limit, found after the run: the evaluation page sends the two image halves of a Gloz line back to back, and the glasses hold an image sent within 100 ms of the one before until the next send (Even Hub docs, Display). Where the simulator held a right half, part of the Gloz line was missing from the screen the reader read, which can only have lowered Gloz's score. The app itself now sends the halves 110 ms apart; the evaluation code is kept as it ran so the results can be reproduced.

What these results cannot show: the simulator's font is not pixel exact to the glasses; OCR stands in for a human reader; the time is a model built from published reading and speaking rates plus measured backend times, not a timed person. The first time run lost (Gloz 3.6 s, plain 3.0 s), because Gloz showed a reply in the sender's script and its meaning; Gloz now shows only the meaning when the wearer does not read that language. Run it yourself: `npm run eval` (needs the simulator), `npm run eval:time`, `node eval/score.mjs`.

## Complaints Gloz fixes

From 115 public complaints by G2 and G1 owners (App Store, Google Play, Trustpilot, Hacker News, GitHub, X, press), read on 23 Nov 2026. These are the 44 an app can answer in full or in part; each has today's best solution anywhere and its number. Gloz's numbers come from `node eval/complaints.mjs`, `npm run eval:time` and the evaluation above.

<!-- gen:complaints -->
Of the 44 complaints an app can answer in full or in part: 9 beaten, 3 matched, 7 no number to beat, 9 different measure, 2 not beaten, 4 not built, 10 outside the job.

| # | What a G2 owner wrote | What Gloz does | Gloz | Best today | Result |
|---|---|---|---|---|---|
| 8 | "every time I say "Even AI" the Bluetooth gets disconnected" (31 Mar 2026, Google Play) | No wake word. Gloz listens only while you hold the touchpad or ring. | 0 false wake-ups: nothing listens until you hold | 2.7% missed, at 1 false wake-up per 10 hours | beaten |
| 27 | "the size of the font ... can be customized" (12 Aug 2026, Trustpilot) | Six text sizes, drawn as images. Pick one on the phone or from the glasses menu. | largest text 4.81 times the glasses' own text | largest text 3.1 times the default | beaten |
| 33 | "why can we not reply to a text message??" (21 May 2026, Google Play) | A drafted reply waits under each message. Tap to see it, tap to send it. | 96 words a minute sent, silent (fixed holding replies; AI drafts need a key) | 20.9 words a minute, silent | beaten |
| 81 | "The connection with my calendar seems to constantly get lost" (10 Feb 2026, Trustpilot) | Gloz pairs once. The pairing has no end date; the backend holds the service tokens. | pairing expiry: none | 6 months without a forced sign-in | beaten |
| 83 | "activate randomly without you activating them" (20 Sep 2025, Trustpilot) | Nothing listens until you hold. Nothing sends until the reply is on screen and you tap. | 0 sends from 20 single presses; 0 false wake-ups | 1 false activation per 10 hours | beaten |
| 93 | "a pause gesture for Conversate directly on the glasses or ring" (27 Oct 2026, App Store) | In Listen to the room: one tap pauses (the microphone turns off), one tap goes on; swipe up reaches any earlier line. | 1 tap to pause or go on; every earlier line reachable (yes) | 1 tap to stop or restart, 10 s go-back | beaten |
| 102 | "Pro Mode used up all its credits in one 2-hour meeting (tr)" (21 Nov 2026, X) | Listen to the room has no credits and no time limit; with Whisper on the Gloz server it costs nothing per minute. | no limit (11 hours tested), $0 a month with Whisper on the server | 4 hours a meeting, unlimited minutes, $19.99 a month | beaten |
| 103 | "only have a voice input" (13 Nov 2026, X) | Reply with two taps and no voice. | 96 words a minute sent, silent (fixed holding replies; AI drafts need a key) | 20.9 words a minute, silent | beaten |
| 104 | "there seems to be a character limit (tr)" (20 Nov 2026, X) | Long messages are paged line by line. Nothing is cut. | 2,000,000 of 2,000,000 characters kept | 1.02 million characters in one note | beaten |
| 28 | "why the display glass is so off to the top" (12 Nov 2026, X) | The line sits in the middle, or lower if you pick Low. | line centred, or 72 px lower | image centred on straight-ahead gaze | matched |
| 35 | "let Siri AI be accessed as an alternative" (9 Oct 2026, App Store) | The backend owner picks the model: any OpenRouter model, Claude or ChatGPT. | 600+ models through OpenRouter, plus Claude and ChatGPT | 600+ models behind one key | matched |
| 43 | "the app does not currently support the Russian language" (6 Nov 2026, App Store) | Text is drawn as images with the phone’s own fonts, so scripts the glasses lack still show. | 84 of 100 held-out Arabic, Persian, Hindi, Thai and Hebrew messages shown; plain G2 text 0 of 100 | 150+ writing systems | matched |
| 32 | "without it coming back <30s later" (26 Sep 2026, Google Play) | Messages come straight from Telegram, Slack, Discord and Gmail. One you answered or skipped does not come back. | 0 messages shown twice (tests) | no measured number found | no number to beat |
| 36 | "sometimes fail with a "server error"" (6 Feb 2026, Google Play) | If one AI provider fails, the next is tried. If all fail, a holding reply still appears. | 200 of 200 messages got a reply with no AI reachable | no measured number found | no number to beat |
| 40 | "the translation stops working whenever the app detects the target language" (29 Jul 2026, Google Play) | For messages: Translate shows every message in your language; the reply goes out in the sender’s language with its meaning shown to you. | built for messages; not measured without an AI key | no measured number found | no number to beat |
| 42 | "we need to be able to share a transcript directly" (25 Mar 2026, Google Play) | The last conversation shows on the phone screen with Copy and Share. | built; no number | no measured number found | no number to beat |
| 89 | "No instructions are available for any apps." (10 Oct 2026, App Store) | Every Gloz screen says what a tap, hold or swipe does there. | 0 of 7 screens without a press hint | no measured number found | no number to beat |
| 92 | "forced to see the news" (14 May 2026, Google Play) | Gloz shows only the chats you keep; "Mute this chat" in the glasses menu removes one. | no number | no measured number found | no number to beat |
| 98 | "looses internet connection more than often" (6 May 2026, App Store) | Replies wait in a saved outbox through any drop and go out when the link is back; the line says how many wait. | 0 replies lost after a drop and an app restart (tests) | no measured number found | no number to beat |
| 24 | "low touch sensitivity, making scrolling difficult" (4 Mar 2026, Google Play) | A reply goes out only when it is on screen and you tap. A swipe back undoes a swipe. | 0 of 20 single presses sent a reply not on screen | over 90% gesture accuracy for new users | different measure |
| 29 | "A third of the display ... constantly displaying date and time" (13 Jul 2026, App Store) | Gloz shows one line: your own messages and mail, nothing else. | no number | 8 slots the user picks on one screen | different measure |
| 30 | "the option to change the display timeout is no longer there" (7 May 2026, Google Play) | Each press means the same on every Gloz screen. Six actions in the glasses menu. | no number | 0.88 gestures a second | different measure |
| 41 | "AI summary comes out in English (tr)" (26 May 2026, App Store) | Replies are written in the sender’s language; their meaning is shown in yours. | 200 of 200 replies in the sender’s language (fixed holding replies; AI drafts need a key) | 99.2% of the English score in Japanese | different measure |
| 46 | "you need programming expertise to get keys and secrets" (10 Oct 2026, App Store) | The wearer types no key. Keys live on the backend; the glasses pair with a 6-digit code. | 0 keys typed by the wearer | 850 million weekly store users | different measure |
| 52 | "when it sends EVERYTHING to the AI (tr)" (16 Jun 2026, Google Play) | Message text lives only in the backend’s memory and is dropped once the reply is sent. Open source. | 0 of 200 message texts written to disk; 0 kept after sending | $1,000,000 top security bounty | different measure |
| 53 | "a half baked product for a fully baked price" (29 Jul 2026, App Store) | Gloz adds the message job to glasses already owned. Free, MIT licence. | $0 | $799 for display glasses with an input band | different measure |
| 80 | "The text jumping ... frequently causes severe dizziness" (24 Jul 2026, Trustpilot) | One line at a time. A line, or a caption, never changes while it is shown; the next one replaces it whole. | 0 of 9900 captions rewritten after being shown | better on 5 of 6 comfort statements | different measure |
| 97 | "Translate does not detect the language" (13 Sep 2026, press) | For messages, the language comes from the text; nothing to set. | 0 languages set by the wearer | 60+ spoken languages found automatically | different measure |
| 37 | "Captions sometimes appear with noticeable delays" (16 Nov 2026, App Store) | Listen to the room: captions of the conversation in your language, from 4-second pieces of sound. | about 7.2 s from words spoken to caption (Whisper on the Gloz server) | 130 ms to first caption | not beaten |
| 85 | "If you start Conversate from the R1 ring it quits early" (5 Feb 2026, Trustpilot) | Listen to the room keeps going until you stop it from the glasses menu. | 9900 of 9900 pieces kept over 11 hours (logic test, not a recording) | 50 hours of continuous recording | not beaten |
| 38 | "There is no voiceprint recognition/isolation" (24 Jul 2026, Trustpilot) | Telling speakers apart: not built. | none | 11.2% diarization error rate | not built |
| 79 | "Conversate relies on limited Prep Notes" (11 Sep 2026, Trustpilot) | Documents in live conversation: not built. | none | 600 sources of up to 500,000 words | not built |
| 91 | "not good at emotional signals" (3 May 2026, Trustpilot) | Tone of a spoken conversation: not built. | none | 77.6% accuracy on IEMOCAP | not built |
| 100 | "it couldn’t remember anything or recall" (14 Jul 2026, X) | Memory across conversations: not built. Drafts see the last 10 messages of the chat. | none | 96.4% on LongMemEval | not built |
| 31 | "it shows different images in the left and right eyes" (3 Apr 2026, Google Play) | Teleprompter: not part of reading and answering messages. | none | no measured number found | outside the job |
| 34 | "responds that it can’t help me" (1 Oct 2026, App Store) | Answering questions is an assistant job, not Gloz’s. | none | Arena text score 1507 | outside the job |
| 44 | "Only walking or cycling navigation" (1 Nov 2026, App Store) | Navigation: not part of the job, and no maps service is on the allowed list. | none | accurate arrival time on 97% of trips | outside the job |
| 45 | "The route does not automatically update" (4 Apr 2026, Google Play) | Navigation: not part of the job. | none | 75% fewer wrong-side-of-street positions | outside the job |
| 48 | "The syncing is extremely unreliable" (21 Oct 2026, App Store) | Terminal: not part of the job. | none | under 5 ms keystroke response | outside the job |
| 87 | "Prices are delayed or flat-out wrong" (12 Sep 2025, Trustpilot) | Stock prices: not part of the job, and the market data app is in a track Gloz does not enter. | none | 6.1 µs median feed latency | outside the job |
| 88 | "the lack of apple health, maps, and even note integration" (7 Aug 2026, Trustpilot) | Maps and notes: not part of the job. | none | no measured number found | outside the job |
| 94 | "access to a kindle reader" (19 Jul 2026, App Store) | Books: not part of the job. | none | the e-book app itself at 1920 x 1080 | outside the job |
| 96 | "select terminal mode or any feature from the menu" (29 Apr 2026, App Store) | Terminal: not part of the job. Gloz itself opens from the glasses menu once installed. | none | 1 gesture, phone not touched | outside the job |
| 101 | "put tasks in the dash via API" (12 Nov 2026, X) | Tasks: not part of the job. | none | no measured number found | outside the job |
<!-- /gen -->

## For Even Realities

The other complaints need the glasses, the Even Realities app, the SDK or the company. Each has the best solution found anywhere today and its number.

### Five things the SDK was missing (feature requests)

1. **Stay connected and reconnect alone.** Owners report drops in pockets, crowds, with earbuds, and no reconnect (complaints 1 to 3, 5 to 7). Best today: the phone OS wakes the companion app when the paired device comes back in range (Android Companion Device Manager presence, iOS Bluetooth state restoration); no maker publishes a reconnect time.
2. **Login that works offline and never logs out.** "can't login ... can't use the 1000$ items I bought" (30 Oct 2026). Best today: local features with no account at all; sign-in that stays valid until six months unused (Google OAuth refresh tokens); passkeys, 93% sign-in success against 78% for older two-step sign-in (FIDO Passkey Index, 15 Oct 2026).
3. **No phone drain when the glasses are away.** "Within just one hour of waking up, my iPhone battery drops to approximately 80%" (13 Nov 2026). Best today: OS presence events instead of constant scanning; Google Play flags apps where over 5% of sessions hold more than 2 hours of wake locks a day.
4. **Plugin access to phone notifications.** Plugins cannot read phone notifications (GitHub #24), so each app must reach each service itself. Best today: Apple Notification Center Service and Android NotificationListenerService give accessories and apps the notification and its actions.
5. **Connection state for plugins.** A plugin cannot tell the wearer the glasses or ring dropped. SDK 0.0.16 has a connection type in device status; the simulator sends no status events, and the docs do not cover it yet. Best today: the OS tells the companion app on every connect and disconnect.

### The rest, by complaint number

| # | Complaint | Best today | Number to beat |
|---|---|---|---|
| 1 | Glasses and ring drop, no reconnect | Phone OS presence wake-up for companion apps | no measured number found |
| 2 | Drops when the phone locks | Companion app kept alive or relaunched by the OS | no measured number found |
| 3 | App must be opened by hand | OS starts the companion app when the device appears | no measured number found |
| 4 | A drop while charging stops charging | none published | no measured number found |
| 5 | Drops in crowds | Bluetooth LE Coded PHY | 12 dB stronger link than LE 1M |
| 6 | Ring drops when earbuds connect | Batched connection requests (Android 10 and later) | no measured number found |
| 7 | Drops with several apps open | Google Play memory limits | 1.50 GB background memory on an 8 GB phone |
| 9 | No entry on bad internet | Open-source companion apps that need no account or server | no measured number found |
| 10 | Some phones crash or fail | Google Play per-phone crash limits | under 8% crash rate on every phone model |
| 11 | Cannot log in | Login service with a contractual availability guarantee | 99.99% login availability |
| 12 | Login needed even for local features | Companion apps that need no account | 0 accounts for local features |
| 13 | Logs out by itself | Google OAuth refresh tokens | 6 months without a forced sign-in |
| 14 | Sign-up and password problems | Passkeys | 93% sign-in success |
| 15 | Must pair a device to open the app | Companion apps that open with no device | no measured number found |
| 16 | Phone battery drain | OS presence events, Google Play wake-lock limit | under 5% of sessions over 2 hours of wake locks a day |
| 17 | Location forced on | Android pairing with no location permission | 0 location permissions to pair |
| 18 | Crashes and black screens | Best mobile apps' crash-free sessions | 99.99% crash-free sessions |
| 19 | Updates break features | Phased release over 7 days | 1% of users on day one |
| 20 | Updates will not install | Android A/B updates with fallback | no measured number found |
| 21 | Display goes black or one side fails | Remote device diagnostics | no measured number found |
| 22 | Cracked lenses, one frame size | US FDA lens drop-ball rule; two frame sizes | 50 inch drop-ball pass; 2 sizes |
| 23 | Batteries fade | Phone batteries rated for 1,000 cycles | 80% capacity after 1,000 cycles |
| 25 | Ring sizing | Free sizing kit, size later | 12 sizes with a free kit |
| 26 | Ring health data locked in | Health data written to Google Health Connect | 9 data types |
| 39 | Nothing works offline | Speech models that run on the device | 5.42% word error rate, offline |
| 47 | SDK lacks basic abilities | Notification, audio and file access on phone platforms | no measured number found |
| 49 | Support refuses or does not answer | 365-day returns | 365 days |
| 50 | Long waits | Prescription glasses made in one day | 2 business days |
| 51 | G1 owners left behind | Eight years of software support | 8 years |
| 54 | Coupon instead of repair | EU legal guarantee | 2 years of free repair, replacement or refund |
| 55 | Lost parcels | Marketplace delivery guarantee | 48 hours to resolve |
| 56 | No phone or chat support | Round-the-clock phone support | under 10 seconds to answer |
| 57 | Support asks for videos and logs | Remote diagnostics from devices | 19% lower support cost |
| 58 | Pay first for inspection | Replacement shipped first, no hold | $0 paid, $0 held |
| 59 | New model weeks after purchase | Laptops whose new boards fit the old chassis | every board fits |
| 60 | Empty boxes | Scanned picking | 99.9% pack accuracy |
| 61 | Frames snap | ISO 12870:2024; two-year frame warranty | 2 years |
| 62 | Hard to read in sunlight | Brighter display glasses (maker's rating) | 6,000 nits peak |
| 63 | Accessories not covered | Lifetime accessory warranty | lifetime |
| 64 | Origin not stated | EU product safety rule on listings | maker's address on every listing |
| 65 | Repairs take months | Replacement in hand fast | 3 business days |
| 66 | Lens quality | Progressive lens wearer study | 69 of 73 adapted on day one |
| 67 | Wrong prescription charged | Remakes at no charge | $0 |
| 68 | Prescription re-asked | US contact lens passive verification | 8 business hours |
| 69 | Ring cracks | Titanium ring body | no measured number found |
| 70 | Price higher at checkout | UK drip-pricing ban | $0 difference |
| 71 | No cancel after 24 hours | Cancel until shipping | no cut-off |
| 72 | Delayed past the return window | EU burden of proof | 1 year |
| 73 | Useless without the phone | Watches that work away from the phone | no measured number found |
| 74 | Battery swelling | Charge limit setting; 1,000-cycle cells | 80% after 1,000 cycles |
| 75 | App access threatened | Companion apps that need no vendor account | 0 vendor accounts |
| 76 | Charged before shipping | Charge on shipment | $0 before shipping |
| 77 | No military addresses | Domestic postage to military addresses | domestic price |
| 78 | Slow refund | US mail order refund rule | 7 working days |
| 82 | Case whistles | Power design with resonance above hearing | above 20 kHz |
| 84 | No speaker | Open-ear speakers in display glasses | 2 speakers |
| 86 | Slow response | Lowest measured headset display latency | 11 ms |
| 90 | No camera | Camera in display glasses | 12 MP |
| 95 | Cannot see what music plays | Now-playing on the worn device | no measured number found |
| 99 | Green only | Full-color display glasses (maker's rating) | full color at 6,000 nits |
| 105 | Moisture in prescription pairs | Sealed smart glasses | IP67 |
| 106 | Coating peels | Hard lens coating | Bayer ratio 16 |
| 107 | Nose pads hard to fit | Slide-on pads | no measured number found |
| 108 | Ring not in the glasses case | Charging case for a ring | 5 ring charges |
| 109 | No alcohol wipes | Displays rated for 70% alcohol | 70% isopropyl |
| 110 | Eye strain worry | Third-party eye comfort certificate | 5 star rating |
| 111 | Even Hub down, own apps blocked | Written uptime agreement | 100% |
| 112 | Review delayed a release | App review timing | 90% reviewed in 48 hours |
| 113 | No paid apps | Store that keeps no share of the first $1M | 100% of the first $1M |

## Business potential and safety

- **Who pays.** Even's CEO says one third of users are company executives and that users wear G2 8 to 10 hours a day (interview, Silicon Valley Investclub, 31 Aug 2026). An executive's day is meetings; messages wait on the phone. Gloz answers them from the glasses.
- **Demand.** Of the 115 public complaints read, "you can't reply" (33), notifications (32), missing scripts (43), text too small (27) and voice-only input (103) are each answered here.
- **Launch in Even Hub.** The app is a standard Even Hub package ([app/app.json](app/app.json), `gloz.ehpk` built in CI): name without "Even", system exit dialog on double tap at the root, setup message on the glasses before pairing, setup remembered, only the permissions it uses (network to its own backend, glasses microphone).
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
- The list of owner complaints and today's best solutions, gathered before the build.
- Everything else in this repository was written from 23 Nov 2026.

## Licence

MIT. Sample sentences in `eval/set/` are from Tatoeba under CC BY 2.0 FR.
