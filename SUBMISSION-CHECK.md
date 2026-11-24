# Submission check

Every requirement and rule on https://dorahacks.io/hackathon/even-realities/detail (read 23 Nov 2026; full text in [PLAN.md](PLAN.md)), its words beside the proof. The founder submits on DoraHacks; this file is not a submission.

## What to submit

| The page says | Proof |
|---|---|
| "A public GitHub/GitLab repository with a README that explains setup" | https://github.com/drexthealpha/gloz (public). README "Setup": 5 steps, checked by `npm run check:setup` in [scripts/check-setup.mjs](scripts/check-setup.mjs). |
| "A demo video of up to 3 minutes, running in the simulator or on G2" | https://drexthealpha.github.io/gloz/gloz-demo.mp4: 71 s, recorded in the Even Hub simulator by [scripts/video.mjs](scripts/video.mjs) driving the real app and backend. |
| "A short description: the problem, who it is for, how it works, and the track" | See "Short description" below. |
| "Optional: feature requests, up to 5 things the APIs you used were missing" | README, "For Even Realities: five requests for the SDK": 5 requests. |
| "Optional: a packaged .ehpk build" | https://github.com/drexthealpha/gloz/releases/latest/download/gloz.ehpk ; also built by CI on every push and by `cd app && npm run pack`. |
| Sidebar: "GitHub/Gitlab/Bitbucket Link Required" | https://github.com/drexthealpha/gloz |
| Sidebar: "Demo Video Required" | https://drexthealpha.github.io/gloz/gloz-demo.mp4 |

## Rules

| The page says | Proof |
|---|---|
| "Teams of 1 to 4 people ... You can join one team only." | One person. |
| "A team can submit up to 2 projects" | One project. |
| "Build during the hackathon. Open-source libraries and existing APIs are allowed; say in your README what existed before Nov 23." | README, "What existed before Nov 23". First commit of this repository: 24 Nov 2026 (`git log --reverse`), inside the build week. |
| "Build your core integration on the apps listed in your track. On top of that, you can add any other tools (for example an LLM for reply drafts or speech-to-text). Entering a second track is optional." | Tracks 01 and 04. Services used: Telegram, Slack, Discord (track 01); Gmail, Claude, ChatGPT, OpenRouter (track 04). Speech to text runs on Gloz's own backend, as the page asks ("send it to your own server"). See [server/connectors.mjs](server/connectors.mjs), [server/ai.mjs](server/ai.mjs), [server/stt.mjs](server/stt.mjs). |
| "If your app genuinely connects apps from several tracks ... you can enter up to 2 tracks." | One flow: a message from Telegram, Slack, Discord or Gmail, answered with a draft from Claude, ChatGPT or OpenRouter. |
| "Money safety: demos use testnet, paper trading or read-only data. Do not hold user funds. No financial advice. Never commit API keys or secrets." | Gloz moves no money and gives no advice. Keys are read from the backend's environment only; `.env` is in [.gitignore](.gitignore); [.env.example](.env.example) holds names only. |
| "Respect the terms of the services you integrate and the privacy of the people whose messages you show." | Only chats the wearer picks; "Mute this chat"; message text dropped after the reply is sent (README, "Business potential and safety"; `node eval/complaints.mjs`). Telegram through the official Bot API, Slack, Discord and Gmail through their official APIs with the scopes listed in .env.example. |
| "Submit on this page before the deadline." | The founder submits. Deadline on the page: 2026/11/29 20:59 (UTC+1). |

## Build for G2 (limits on the page)

| The page says | Proof |
|---|---|
| "a web app (HTML, CSS, JavaScript or TypeScript) running in a WebView inside the Even Realities App ... through the Even Hub SDK" | [app/](app/): Vite and TypeScript, `@evenrealities/even_hub_sdk` 0.0.16. |
| "One app on screen at a time ... When the user switches away, it cannot show anything" | Gloz keeps its state and outbox in local storage and picks up where it was ([app/src/app.ts](app/src/app.ts)). |
| "No access to other apps' notifications. Talk to the service directly through its API." | [server/connectors.mjs](server/connectors.mjs). |
| "Bring your own speech-to-text ... send it to your own server" | [server/stt.mjs](server/stt.mjs): Whisper on the backend, or OpenAI transcription. |
| "Use a backend. External calls must be whitelisted in app.json and pass CORS ... never ship API keys inside the app." | [app/app.json](app/app.json) network whitelist; CORS headers in [server/app.mjs](server/app.mjs); no key in `app/`. |
| "Sign-in: Google sign-in does not work inside the WebView. Use a separate login page or a pairing code." | 6-digit pairing code ([app/src/phone/PairScreen.tsx](app/src/phone/PairScreen.tsx)); Gmail sign-in runs on the backend machine ([server/google-auth.mjs](server/google-auth.mjs)). |
| "Design for a glance: one thing on screen and a few words." | One line on the glasses ([app/src/glasses.ts](app/src/glasses.ts)). |
| "Display: monochrome green, 576 × 288 per eye" | Two 288 x 144 image tiles make one 576 x 144 line ([app/src/render.ts](app/src/render.ts)). |

## Judging criteria (exact names)

README, "For judges: where to look", has one row for each: Usefulness on G2, Read and write, Technical execution, UX for display and voice, Business potential and safety.

## Even Hub review rules (docs, App Submission)

| Rule | Proof |
|---|---|
| Name 20 characters or fewer, not containing "Even" | "Gloz" |
| Root double tap calls `shutDownPageContainer(1)` | [app/src/glasses.ts](app/src/glasses.ts) `exit()`, called on double tap in [app/src/app.ts](app/src/app.ts) |
| First launch needing setup shows a message on the glasses, never a black screen | "Open Gloz on your phone to pair" ([app/src/core/flow.ts](app/src/core/flow.ts), tested) |
| Setup remembered across launches | pairing token and settings in local storage |
| Every permission used | `network` (backend), `g2-microphone` (hold to speak), `location` (only while Navigation or the Dashboard is open) |

## Short description (for the DoraHacks form)

**Problem.** Messages on Even G2 can only be glanced at, not answered, and the glasses' font drops whole scripts: in the Even Hub simulator, plain G2 text showed none of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew. Owners also ask for bigger text, replies, and silent input.
**Who it is for.** The executive who wears G2 8 to 10 hours a day, in meetings, with messages waiting on the phone.
**How it works.** Gloz shows one line at a time on the glasses, drawn as an image so every script shows, at the size the wearer picks. Tap to see a drafted reply, tap again to send it; hold to say what to change. Messages come from Telegram, Slack, Discord and Gmail; drafts from Claude, ChatGPT or OpenRouter; a backend holds every key; replies wait through drops.
**Track.** 01 Messaging & News (main) and 04 AI Assistants & Work.

## Video

https://drexthealpha.github.io/gloz/gloz-demo.mp4 (71 s). Scenes: the same Thai message as plain G2 text and as Gloz; reading and answering messages in Arabic, Persian, Hindi, Thai and Hebrew; a reply saved through a dropped link and sent when it returns; closing with a double tap; the measured results. Sample messages from Gloz's labelled sample service, since no service key is set.

## Checked

Checked on 23 Nov 2026 by an agent that did not build Gloz, on a fresh clone of the public repository: every rule it could check passed (tests, text check, setup check, no secrets in history, demo, badge, video and package links). Checked again the same evening on the final code: 0 FAIL; tests 47 of 47 at that commit; the video plays 71.28 s by ffprobe. It could not check team size, the services' terms in practice, or the submission itself, which only the DoraHacks form and the founder can show.
