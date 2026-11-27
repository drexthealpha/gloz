# Gloz plan

One job: read and answer every message and conversation on Even G2 without the phone, in your language, at your size.
One person: the executive who wears G2 8 to 10 hours a day.
Track: 01 Messaging & News (main), 04 AI Assistants & Work (second), as the rules allow when one flow connects apps from both.

## The official page, word for word

Source: https://dorahacks.io/hackathon/even-realities/detail, read 23 Nov 2026 in a browser, and read again later the same day: P18, P53 and P94 changed and are given here as they read on the second read. Before, P18 said "Only the apps listed in the tracks you enter qualify", P53 said "Cash is paid in USDT within 7 days of Demo Day.", and P94 said "Use only the apps listed in the tracks you enter." Text copied as the page shows it, in order. Lines are numbered for reference (P1, P2, ...).

```
P1  Heads Up: Even Realities Hackathon by TVM Ventures & Daos Hub
P2  PRIZE POOL 10,000 USD
P3  EVENT TIMELINE (UTC+1) Pre-registration 2026/11/18 09:00 / Submission 2026/11/23 09:00 / Deadline 2026/11/29 20:59 / Virtual
P4  SUBMISSION REQUIREMENTS: GitHub/Gitlab/Bitbucket Link Required / Demo Video Required
P5  Even Realities × TVM Ventures × Daos Hub
P6  Read a new Telegram message, check who you are meeting next, get a short answer from your AI. Even G2 puts a private display in everyday eyewear, so all of this takes a glance instead of your phone.
P7  Heads Up is a 7-day online hackathon. Take the services people already use every day, starting with Telegram, and make them work on G2.
P8  At a glance
P9  Build week: Nov 23–29, 2026 · online, open to builders worldwide
P10 Prizes: $10,000 prize pool: 10 winners + a Community Partner Award of up to $500, plus up to 10 pairs of G2
P11 Fast-track: finalists pitch to TVM Ventures and partner VCs
P12 Demo Day: Dec 3, 14:00–18:00 · Daos Hub, Dubai · finalists can demo remotely
P13 No glasses needed: build and test in the free Even Hub simulator
P14 Coming to Demo Day in Dubai? RSVP on Luma
P15 What makes a great G2 app
P16 It shows one thing that matters, then lets you act on it in seconds: reply by voice, confirm with a tap on the glasses or the R1 ring. We call this read and write, and it is what we judge first.
P17 Tracks
P18 Pick a main track and build your core integration on its apps: they all have open APIs, so every team can build a real, working integration. On top of that, you are free to add any other tools, like an LLM for reply drafts or speech-to-text. If your app genuinely connects apps from several tracks (e.g. Telegram + Hyperliquid in one flow), you can also enter a second track (up to 2).
P19 01 · Messaging & News
P20 Apps: Telegram (accounts, bots, channels, Mini Apps) · Discord · Slack
P21 See new messages only from the chats you pick, for example your work group
P22 Get a short digest of the Telegram channels and crypto communities you follow
P23 Reply by voice, or approve a reply drafted by an AI agent
P24 02 · Crypto & DeFi
P25 Apps: Gram Wallet · Polymarket · Hyperliquid · Trust Wallet
P26 Check a wallet balance, live odds or an open position
P27 Place a testnet bet or order by voice and confirm with one tap
P28 03 · Exchanges & Stocks
P29 Apps: Binance · OKX · Bybit · Coinbase · Interactive Brokers
P30 Follow PnL, positions and price alerts during a trading session
P31 Confirm quick actions like "Move $500 from spot to margin? Yes / No"
P32 04 · AI Assistants & Work
P33 Apps: Claude · ChatGPT · OpenRouter · Notion · Google Workspace (Gmail, Calendar, Drive)
P34 Get a short brief before your next meeting
P35 Clear your inbox in 30 seconds or get an answer from your own notes
P36 Reply to an email, add a task or move a meeting by voice
P37 Special prize · Best Telegram integration
P38 Open to projects from any track: the best use of Telegram (accounts, bots, channels or Mini Apps) on G2.
P39 G2 is the display, voice and input layer. Trading, custody and licensing stay with the underlying providers, reached through their APIs.
P40 Prizes
P41 $10,000 prize pool in USDT + up to 10 pairs of G2
P42 Prize / Cash / G2
P43 Grand Prize / $2,000 / 2 pairs
P44 1st place in each of the 4 tracks / $1,250 / 1–2 pairs
P45 2nd place in each of the 4 tracks / $375
P46 Best Telegram integration / $1,000
P47 Community Partner Award / up to $500
P48 Every finalist also gets:
P49 a fast-track pitch to TVM Ventures and partner VCs
P50 a demo slot at Demo Day in Dubai, on site or remote
P51 hackathon merch
P52 Community Partner Award: one community wins up to $500: the one with the most points (1 per participant with a valid submission with demo, +3 per finalist, +5 per winner; minimum 3 valid submissions). Name the community that sent you in "How did you hear about this hackathon?"; paid after Demo Day.
P53 A project can win one cash prize: if it places in several categories, it gets the highest one and the next project moves up. Cash is paid in USDT on TON within 7 days of Demo Day, no KYC needed. G2 prizes are shipped by Even Realities to winners worldwide after the event: refurbished, fully working units with standard (non-prescription) lenses. More sponsor prizes may be announced during registration.
P54 Schedule
P55 All times are Dubai time (GMT+4).
P56 Nov 18 · Registration opens
P57 Nov 23, 12:00 · Online kickoff and Even Realities tech briefing · build starts
P58 Nov 29, 23:59 · Submission deadline
P59 Nov 30 – Dec 1 · Judging · finalists announced
P60 Dec 3, 14:00–18:00 · Demo Day and awards at Daos Hub, Dubai
P61 Build for G2
P62 The hardware and your app
P63 Display: monochrome green, 576 × 288 per eye
P64 Input: microphone, touch controls on the glasses, R1 ring
P65 Not on the glasses: camera, speaker
P66 Your app: a web app (HTML, CSS, JavaScript or TypeScript) running in a WebView inside the Even Realities App, talking to G2 over Bluetooth through the Even Hub SDK
P67 Know the limits before you design
P68 One app on screen at a time. While your app is open, it can show live data and take input. When the user switches away, it cannot show anything or pop up alerts.
P69 No access to other apps' notifications. Talk to the service directly through its API.
P70 Bring your own speech-to-text. The SDK gives you raw microphone audio: send it to your own server (e.g. Whisper).
P71 Use a backend. External calls must be whitelisted in app.json and pass CORS. Route API calls through your own server and never ship API keys inside the app.
P72 Sign-in: Google sign-in does not work inside the WebView. Use a separate login page or a pairing code.
P73 Design for a glance: one thing on screen and a few words. Think "trading session" or "inbox in 30 seconds", not dashboards.
P74 See what already exists
P75 Browse the Even Hub catalogue before you pick an idea: messages, news, AI assistants, navigation, timers. Build something new, or something clearly better. Even Realities will share tips on what makes a G2 app successful at kickoff.
P76 Set up in 5 steps
P77 Read the Even Hub docs.
P78 Install Node.js and the Even tools:
P79    npm install -g @evenrealities/evenhub-cli
P80    npm install -g @evenrealities/evenhub-simulator
P81 Start from the official minimal template and point the simulator at your local dev server.
P82 Change one line of text and check that one input works before you build the full project.
P83 Have G2? Install the Even Realities App, pair and update the glasses, and enable developer access on the portal to test on the device.
P84 Submission and rules
P85 What to submit
P86 A public GitHub/GitLab repository with a README that explains setup
P87 A demo video of up to 3 minutes, running in the simulator or on G2
P88 A short description: the problem, who it is for, how it works, and the track
P89 Optional: feature requests, up to 5 things the APIs you used were missing. We'll pass them to the teams behind those apps
P90 Optional: a packaged .ehpk build
P91 Rules
P92 Teams of 1 to 4 people, from anywhere in the world. You can join one team only. A team can submit up to 2 projects, but we judge how production-ready an app is, so we recommend focusing on one.
P93 Build during the hackathon. Open-source libraries and existing APIs are allowed; say in your README what existed before Nov 23.
P94 Build your core integration on the apps listed in your track. On top of that, you can add any other tools (for example an LLM for reply drafts or speech-to-text). Entering a second track is optional.
P95 Money safety: demos use testnet, paper trading or read-only data. Do not hold user funds. No financial advice. Never commit API keys or secrets.
P96 Respect the terms of the services you integrate and the privacy of the people whose messages you show.
P97 Submit on this page before the deadline. Organizers may disqualify projects that break these rules or the DoraHacks terms.
P98 Judging
P99 Usefulness on G2 · 30%. Solves a real everyday moment, works at a glance and hands-free.
P100 Read and write · 25%. Acting is fast: a short phrase, one tap or the ring, with smart defaults or AI drafts instead of long dictation.
P101 Technical execution · 20%. Works end to end, reliable, clean code.
P102 UX for display and voice · 15%. Clear on a 576 × 288 monochrome display, natural by voice.
P103 Business potential and safety · 10%. Real users and demand, careful with data and money.
P104 Judges come from Even Realities, TVM Ventures, partner venture funds, sponsors and Daos Hub.
P105 Organizers
P106 Even Realities: makers of G2 smart glasses and the Even Hub developer platform
P107 TVM Ventures: venture fund backing founders who empower people while protecting privacy and freedom
P108 Daos Hub: Web3 community hub and event venue in Dubai Internet City
P109 Questions? Ask in the hackathon chat on this page or in the community channel announced at kickoff.
```

The Q&A page (https://dorahacks.io/hackathon/even-realities/qa) showed no questions in the page text on 23 Nov 2026.

## The five criteria, and where Gloz answers each

| Criterion (exact name) | Weight | What Gloz does |
|---|---|---|
| Usefulness on G2 | 30% | Every new message from the chats you pick, one line at a time, with the phone in the pocket |
| Read and write | 25% | An AI draft waits under each message; one tap sends it, one word changes it |
| Technical execution | 20% | Real Telegram, Slack, Discord and Gmail through one backend; tests run with no key; replies wait in a queue through drops |
| UX for display and voice | 15% | Text drawn as an image, so every script shows, at the size the wearer picks |
| Business potential and safety | 10% | Nothing sent without the wearer's word; keys only on the backend; message text not stored after sending |

## Build order

1. Complaints first: the rows marked YES or PARTLY that fall inside the one job.
2. The locked evaluation (eval/): expected answers committed before the run.
3. The app (app/), the backend (server/), the live demo (demo/).
4. README, SUBMISSION-CHECK.md, video, .ehpk.

Owner: drexthealpha · reviewed 2026-11-27
