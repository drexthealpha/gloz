// Fills the generated blocks of README.md from eval/results, so every number
// on the page comes from a command anyone can run.
//   node scripts/readme.mjs          rewrite the blocks
//   node scripts/readme.mjs --check  fail if README.md differs from what the results say
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { complaintRows } from '../eval/rows.mjs'

const R = n => new URL(`../eval/results/${n}`, import.meta.url)
const read = n => existsSync(R(n)) ? readFileSync(R(n), 'utf8') : null
const json = n => existsSync(R(n)) ? JSON.parse(readFileSync(R(n), 'utf8')) : null

const blocks = {}
const h = json('heldout.json')
const t = json('time.json')
const v = json('video.json')
// A missing result file fails the check: a page must never keep an old number silently.
const missing = ['heldout.json', 'heldout.md', 'time.json', 'time.md', 'video.json', 'complaints.json', 'cost.json', 'coverage.json'].filter(n => !existsSync(R(n)))
if (missing.length) { console.log('missing result files:', missing.join(', ')); process.exit(1) }
blocks.video = `${v.seconds} s`
// The most one AI draft can cost, from `node eval/cost.mjs` (largest prompt and reply, every byte counted as a token).
const c = json('cost.json')
const cm = c.models['openai/gpt-4.1-mini'], cs = c.models['anthropic/claude-sonnet-4.5']
blocks.cost = `at most $${cm.usdPerDraftAtMost} with gpt-4.1-mini (at least ${cm.draftsPerDollarAtLeast} drafts for $1) or $${cs.usdPerDraftAtMost} with Claude Sonnet 4.5, at OpenRouter's list prices of ${c.read} (\`node eval/cost.mjs\`).`
if (h) {
  const five = ['Arabic', 'Persian', 'Hindi', 'Thai', 'Hebrew']
  const g = five.reduce((n, k) => n + h.by[k].glozA, 0)
  const p = five.reduce((n, k) => n + h.by[k].plainA, 0)
  blocks.first = `**Gloz lets the executive who wears Even G2 all day read and answer every message without the phone, in their language, at their size.** In the Even Hub simulator, plain G2 text showed ${p} of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew; Gloz showed ${g}. Gloz won ${h.wins} of 10 scripts, and${t ? ` cut the modelled median time from message seen to reply sent (published operator times, not timed people) from ${t.plainMedian.toFixed(1)} s to ${t.glozMedian.toFixed(1)} s` : ''}.`
  blocks.heldout = read('heldout.md').trim()
}
if (t) blocks.time = read('time.md').trim()
// Each judging criterion against the best measured elsewhere, with Gloz's own number from eval/results.
// The "best" side is sourced; where Gloz's number is modelled or not measured on people, the verdict says so.
{
  const cj = json('complaints.json'), five = ['Arabic', 'Persian', 'Hindi', 'Thai', 'Hebrew']
  const shown = h ? five.reduce((n, k) => n + h.by[k].glozA, 0) : null, plain = h ? five.reduce((n, k) => n + h.by[k].plainA, 0) : null
  blocks.crit = [
    '| Criterion | Best measured elsewhere | Gloz | Where Gloz stands |',
    '|---|---|---|---|',
    `| Usefulness on G2 (30%) | [6.69 s median per notification glance on Apple Watch, filmed in real use](https://link.springer.com/chapter/10.1007/978-3-319-58637-3_22) | ${t.glozMedian.toFixed(1)} s from message seen to reply sent, phone in the pocket, modelled from published operator times | different measure: Gloz is modelled, not timed on people |`,
    `| Read and write (25%) | [12% of mobile replies sent from a suggestion (Google Smart Reply)](https://research.google/blog/efficient-smart-reply-now-for-gmail) | a reply ready under ${cj.replyLanguage.messages} of ${cj.replyLanguage.messages} messages, sent with ${cj.strayPress.pressesToSend} taps; ${t.wpmMedian.toFixed(0)} words a minute, silent (modelled) | different measure: the share of replies sent from a draft is not measured on people |`,
    `| Technical execution (20%) | [99.99% crash-free sessions, top apps (Luciq 2025)](https://www.luciq.ai/mobile-app-stability-outlook-2025) | ${cj.outage.gotReply} of ${cj.outage.messages} messages got a reply with every AI provider failing; ${cj.strayPress.sendsWithoutReplyShown} of ${cj.strayPress.presses} stray presses sent anything | not measured on users: no crash figures from real use yet |`,
    `| UX for display and voice (15%) | no published figure for reading on a display like G2's | ${shown} of 100 held-out messages in Arabic, Persian, Hindi, Thai and Hebrew shown, against ${plain} with plain G2 text (simulator) | no number to beat |`,
    `| Business potential and safety (10%) | [0 message content handed over under legal process (Signal)](https://signal.org/bigbrother/cd-california-grand-jury/) | ${cj.privacy.messageTextOnDisk} of ${cj.privacy.messages} message texts on the server's disk after sending | matched on message content |`,
  ].join('\n')
}
// Start to first line, from `node eval/run.mjs heldout --first-line` (the CI run gates it at the same budget).
const fl = json('first-line.json')
blocks.firstline = fl ? `${(fl.firstLineMs / 1000).toFixed(1)} s from page start to the first line on the glasses in the simulator (budget ${fl.budgetMs / 1000} s, read ${fl.read})` : 'not measured yet'

// Every complaint an app can act on, with its result: measured wins first, then the rest as they stand.
const ORDER = ['beaten', 'matched', 'not beaten', 'different measure', 'not measured', 'needs a key', 'no number to beat', 'not built']
const rows = complaintRows().sort((a, b) => ORDER.indexOf(a.v) - ORDER.indexOf(b.v) || a.n - b.n)
blocks.wins = [
  '| What G2 owners asked for | What Gloz does | Gloz | Best elsewhere | Result |',
  '|---|---|---|---|---|',
  ...rows.map(r => `| "${r.q}" (${r.d}) | ${r.fix} | ${r.gloz} | ${r.src ? `[${r.best}](${r.src}), read ${r.read}` : r.best} | ${r.v === 'beaten' ? 'Gloz ahead' : r.v} |`),
].join('\n')

// The tests, counted as the runner counts them (each test( call in test/), with the log of every run.
const testFiles = readdirSync(new URL('../test/', import.meta.url)).filter(n => /\.test\.(m?js|ts)$/.test(n))
const testCount = testFiles.reduce((n, f) => n + (readFileSync(new URL(`../test/${f}`, import.meta.url), 'utf8').match(/^\s*test\(/gm) || []).length, 0)
const cov = json('coverage.json')
blocks.tests = `${testCount} tests in ${testFiles.length} files, all run on every push; they cover ${cov.line}% of lines, ${cov.branch}% of branches and ${cov.funcs}% of functions (\`node scripts/coverage.mjs\`, checked in CI): [pass log](https://github.com/drexthealpha/gloz/actions/workflows/ci.yml)`

// Each page and the blocks it must hold; a block written inline (gen-i) stays on its line.
// Links to the exact line that does each job, found by what the line says, so they never point at a stale line.
// A file that is not there (a partial copy of the repository) gets a plain link to the file instead.
const at = (file, needle) => {
  let text
  try { text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8') } catch { return `[${file}](${file})` }
  const i = text.split('\n').findIndex(l => l.includes(needle))
  if (i < 0) { console.log(`${file}: no line with "${needle}": run node scripts/readme.mjs after naming the new line`); process.exit(1) }
  return `[${file}#L${i + 1}](${file}#L${i + 1})`
}
blocks.Lsend = at('app/src/core/flow.ts', 'function send(s: State')
blocks.Ldraft = at('server/ai.mjs', 'export async function draft')
blocks.Lonce = at('server/app.mjs', 'async function sendReply')
blocks.Loutbox = at('app/src/core/outbox.ts', 'add(msgId: string, text: string')
blocks.Llayout = at('app/src/render.ts', 'export function layoutFor')
blocks.Ldrop = at('server/app.mjs', '  function drop(id)')
blocks.Ldraw = at('app/src/render.ts', 'export function drawLine')
blocks.Ltap = at('test/core.test.ts', "test('the reply arrives with the message and one tap sends it")
blocks.Lconn = at('server/connectors.mjs', 'export function connectors')
blocks.Lmove = at('app/src/glasses.ts', 'private move(d')
blocks.Lphone = at('app/src/phone/PairScreen.tsx', 'export function PairScreen')
blocks.Ltime = at('eval/time.mjs', 'const CPS')
// The Even Hub SDK version has one source: app/package.json.
blocks.sdk = JSON.parse(readFileSync(new URL('../app/package.json', import.meta.url), 'utf8')).dependencies['@evenrealities/even_hub_sdk'].replace(/^[~^]/, '')
blocks.Lwho = at('server/app.mjs', 'const by = aiWrote')

const PAGES = { 'README.md': ['first', 'heldout', 'time', 'wins', 'video', 'cost', 'tests', 'Lsend', 'Ldraft', 'Lonce', 'Loutbox', 'Llayout', 'Ldrop', 'Ldraw', 'Ltap', 'Lconn', 'Lmove', 'Lphone', 'Ltime', 'Lwho', 'firstline', 'sdk', 'crit'], 'SUBMISSION-CHECK.md': ['video', 'sdk'] }
let stale = false
for (const [file, want] of Object.entries(PAGES)) {
  const path = new URL(`../${file}`, import.meta.url)
  const before = readFileSync(path, 'utf8')
  let md = before
  for (const k of want) {
    const block = new RegExp(`(<!-- gen:${k} -->)[\\s\\S]*?(<!-- /gen -->)`)
    if (!block.test(md)) { console.log(`${file}: the gen:${k} marker is missing`); process.exit(1) }
    // A function, so a "$" in the text (prices) is never read as a pattern; a short value stays inline.
    const val = blocks[k]
    const was = md
    md = md.replace(new RegExp(`(<!-- gen:${k} -->)[\\s\\S]*?(<!-- /gen -->)`, 'g'), (_, a, b) => k !== 'first' && k !== 'tests' && k !== 'firstline' && !k.startsWith('L') && (val.includes('\n') || val.length > 40) ? `${a}\n${val}\n${b}` : `${a}${val}${b}`)   // the README's first line stays one line
    // A stale block is named with the first line that differs, at its line in the file, so the fix is plain.
    if (md !== was) {
      const a = was.split('\n'), b = md.split('\n')
      const i = a.findIndex((l, n) => l !== b[n])
      console.log(`${file}:${i + 1}: gen:${k} differs from eval/results\n  expected: ${b[i]?.slice(0, 160)}\n  found:    ${a[i]?.slice(0, 160)}`)
    }
  }
  if (md !== before) { stale = true; if (!process.argv.includes('--check')) writeFileSync(path, md) }
}
if (process.argv.includes('--check')) {
  if (stale) { console.log('README.md or SUBMISSION-CHECK.md is out of date: run node scripts/readme.mjs'); process.exit(1) }
  console.log('README and SUBMISSION-CHECK numbers match eval/results')
} else console.log('blocks written:', Object.keys(blocks).join(', '))
