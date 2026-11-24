# Locked evaluation protocol

Written and committed before the first run. The held-out set (eval/set/heldout.json) and this protocol are not edited after that commit; the git history shows the order. Tuning uses eval/set/dev.json only.

## Question

Does Gloz show a new message to the wearer better than plain G2 text display, in each of 10 scripts, and is the time from message seen to reply sent shorter?

## Messages

200 held-out messages, 20 per script: Arabic, Persian, Hindi, Thai, Hebrew, Japanese, Korean, Chinese, Russian, English. Drawn from Tatoeba sentence exports (CC BY 2.0 FR) by eval/build-set.mjs with seed 20261123, 20 to 120 characters each. The expected answer for each message is its exact text.

## The two arms

- Plain: the message in one full-screen firmware text container (576 x 288, padding 4, brightness 4), the way any plain G2 app shows text.
- Gloz: the message drawn by Gloz as images at the size the wearer picks (size 3 of 6), one line per screen, with every screen captured as the wearer pages through.

Both arms run in the Even Hub simulator (evenhub-simulator 0.9.5). Each screen is read from GET /api/screenshot/glasses.

## Reading

Each framebuffer is turned into black text on white (alpha above 0 is ink), scaled up 3 times, and read with Tesseract (tesseract.js 5, the language model for that script; Chinese uses chi_sim plus chi_tra). Gloz screens are read one by one and their text joined in order.

- Reader A (normal sight): the framebuffer as captured.
- Reader B (needs bigger text): the framebuffer blurred with a Gaussian of radius 1.5 px at native size before scaling. This stands for a wearer with reduced near sight, the person in complaint 27.

## Score

Character error rate (CER): Levenshtein distance between the expected text and the read text, over the length of the expected text, after removing all white space from both and applying Unicode NFC.

A message counts as shown when CER is at most 0.10.

- Primary score per script: messages shown under Reader B, out of 20.
- Secondary score per script: messages shown under Reader A, out of 20.
- Gloz wins a script when its primary score is higher than Plain's.

## Time from message seen to reply sent

Same 200 messages. The wearer's actions are counted, and times come from fixed published operator times, plus the measured time Gloz's backend takes to produce a draft.

- Plain: the message is read on the glasses, then the reply is spoken in full and confirmed with one tap. Speaking time: words of the reply at 150 words a minute; the reply is Gloz's own draft, so both arms send the same text.
- Gloz: the message is read, the draft is read, one tap sends it.
- Reading time: 238 words a minute for English (Brysbaert, 2019, Journal of Memory and Language 109); other scripts use the same per-character rate as English.
- Tap: 0.2 s. Speech-to-text return: measured on Gloz's speech server per reply.

Result: median seconds per message for each arm.

## What this cannot show

The simulator font is not pixel exact to the glasses (simulator docs, Caveats). OCR is a stand-in for a human reader. The time model uses published operator times, not a timed person. Real glasses runs are listed in FOUNDER-STEPS.txt.

## Amendments made on the dev set, before the first held-out run

Committed before eval/results/heldout.* exists; the git history shows the order.

1. Reading scale. On dev, Tesseract missed whole lines of large, clean text when scaled up 3 times. Each screen is now read at 1, 2 and 3 times scale, for both arms, and the reading Tesseract reports the highest confidence for is kept. The expected text is never used to choose.
2. Primary score. On dev, a single blur of 1.5 px left Russian and English tied at 5 of 5, so it did not measure size at all; picking a larger blur by hand would mean choosing the threshold that makes one arm fail. The primary score is now free of that choice: for each message, the largest blur in the fixed ladder 0, 1, 1.5, 2, 3, 4, 5, 6, 8 px at which the message is still shown (CER at most 0.10). The ladder is climbed until the first failure; a message not shown even at 0 px scores -1. This is how much worse the wearer's sight can be before the message is lost.
   - Primary score per script: the median of that value over the 20 messages.
   - Gloz wins a script when its median is higher than Plain's.
   - Secondary: messages shown under Reader A (no blur), out of 20, as before.
3. Time: speech-to-text return. No recorded speech exists for the 200 replies, so speech-to-text time cannot be measured per reply. It is counted as 0 s for Plain, which favours Plain. Words for scripts written without spaces are counted as characters divided by 5.7, the same per-character rate the reading time uses. The draft time is measured on Gloz's backend for every message; the drafter used (AI model or the fixed holding reply) is written beside the result. Gloz asks for the draft when the message appears, so only the part of the draft time longer than the reading time is added.

## Amendments made after the first held-out run, before the second

4. The first held-out run is not reported: it had a capture fault that favoured Gloz. Reading the Chinese rows showed that some Plain screens were read while the simulator was still showing the previous Gloz screen; the page switch from Gloz's image page to Plain's text page can take longer than the call that asks for it, and the runner waited a fixed 120 ms. The runner now reads a screen only once the framebuffer has changed from the screen before and then stayed the same for 250 ms. The first run's rows are kept, marked invalid, in eval/out/ (not in the repository).
   In the same pause, three faults in how Gloz draws a line, found by a stranger's walk of the live demo while the first run was going (not from its results), were fixed: a full stop could fall alone onto the next line; very large text could touch the hint under it; the small bars that marked "line 2 of 3" were not understood and are now "2/3" in numbers. The evaluation page draws message lines without "2/3", because it is not part of the message and the reader would count it as wrong characters.
5. Chinese scoring. Tesseract writes simplified characters for traditional text (Tatoeba's Chinese sentences mix both), so a perfect display was scored as wrong. Expected and read text now both pass through the same traditional-to-simplified table (opencc-js, Taiwan to mainland) before the character error rate is taken, for both arms. The expected text is never used to choose a reading.
   No run on real G2 glasses has been made; "FOUNDER-STEPS.txt" above is the maintainer's private list of steps that need hardware or accounts.

## Amendment made after the second held-out run, before the third

6. Line placement. A stranger's walk of the simulator on 24 Nov 2026 found a reply's large text touching its small label at the largest size: the letters were measured on one baseline and drawn on another. Gloz now places each line by the drawn letters' own top and bottom. This moves every line a few pixels up or down, so the second run no longer measures the code that ships. The whole held-out set is run again with the same messages, ladder, reader and scoring (the third run). The third run replaces the second in the README whatever its result; both runs' numbers are kept in eval/results/.
   Third run, 24 Nov 2026: every script as in the second run except Korean shown sharp, 15 of 20 (16 in the second run); the five scripts plain G2 text cannot show stay at 84 of 100 for Gloz and 0 for plain; 10 of 10 scripts won. eval/results/heldout.json is the third run; heldout-run2.json keeps the second.
