# Gloz app

The part of Gloz that runs inside the Even Realities app and draws on the glasses.
Started from the official Even Hub `minimal` template (see "What existed before Nov 23" in the main README).

- `src/core/`: the reading and reply flow, the outbox, line layout. No SDK, no network; tested in `test/`.
- `src/render.ts`: draws each line as an image, so every script shows, at any size.
- `src/glasses.ts`: one line on screen, presses to flow events.
- `src/app.ts`, `src/main.ts`, `src/phone/`: the app, the entry point, the phone screens (shadcn/ui).
- `src/demo.ts`, `demo.html`: the live demo, the same code with a stand-in for the glasses.
- `eval.html`, `probe.html`: evaluation pages, not built into the app.

Run it in the simulator: `npm run dev`, then `evenhub-simulator http://localhost:5173`.

Owner: drexthealpha · reviewed 2026-11-27
