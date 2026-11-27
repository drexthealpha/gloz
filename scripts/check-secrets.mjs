// Fails if a tracked file holds something shaped like a real key or token.
// Run: node scripts/check-secrets.mjs (also in CI). It prints the file and line, never the value.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { ignored } from './ignore.mjs'

const SHAPES = [
  ['OpenAI or OpenRouter key', /\bsk-(?:or-v1-|proj-|ant-)?[A-Za-z0-9_-]{32,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{20,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{30,}/],
  ['Telegram bot token', /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Google refresh token', /\b1\/\/0[A-Za-z0-9_-]{40,}/],
]
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(f => f && !/\.(png|jpg|jpeg|gif|mp4|ehpk|woff2?|ico)$/i.test(f) && !f.startsWith('node_modules/'))
let found = 0, letThrough = 0
for (const f of files) {
  let text = ''
  try { text = readFileSync(f, 'utf8') } catch { continue }
  text.split('\n').forEach((line, i) => {
    // The secrets marker from ignore.mjs on a line lets that one line through (a test fixture), and is counted below.
    if (ignored(line, 'secrets')) { letThrough++; return }
    for (const [name, re] of SHAPES) if (re.test(line)) { found++; console.log(`${f}:${i + 1}: looks like a ${name}`) }
  })
}
if (found) { console.log(`${found} possible secret(s) in tracked files`); process.exit(1) }
console.log(`no secrets in ${files.length} tracked files${letThrough ? ` (${letThrough} line(s) marked ignore-line)` : ''}`)
