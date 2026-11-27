// Two delivery numbers each week, target 0 to 2%:
//   change failure rate  CI runs on main that failed / CI runs on main
//   rework rate          commits that fix a change under 7 days old / commits
//   node scripts/delivery.mjs [days=7]     (weekly in .github/workflows/delivery.yml; needs git history and gh)
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DAY = 864e5
export const changeFailureRate = runs => { const done = runs.filter(r => r.conclusion === 'success' || r.conclusion === 'failure'); return done.length ? done.filter(r => r.conclusion === 'failure').length / done.length : 0 }

// A commit is rework when its message starts with Fix, Revert or Undo, or names a regression, and it touches a file
// that another commit changed less than 7 days before it.
export function reworkRate(commits) {
  const sorted = [...commits].sort((a, b) => a.at - b.at)
  const re = sorted.filter((c, i) => /^(fix(es|ed)?|revert(s|ed)?|undo(es)?)\b|\bregression\b/i.test(c.msg) &&
    sorted.slice(0, i).some(p => c.at - p.at < 7 * DAY && p.files.some(f => c.files.includes(f))))
  return { rate: sorted.length ? re.length / sorted.length : 0, rework: re.map(c => c.sha.slice(0, 7)) }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const days = Number(process.argv[2] || 7), since = new Date(Date.now() - days * DAY).toISOString()
  // The 7 days before the window too, so a fix early in the week sees the change it fixes.
  const log = execFileSync('git', ['log', '--since', new Date(Date.now() - (days + 7) * DAY).toISOString(), '--name-only', '--format=%x00%H%x09%ct%x09%s'], { encoding: 'utf8' })
  const all = log.split('\0').filter(Boolean).map(b => { const [head, ...files] = b.trim().split('\n'); const [sha, t, msg] = head.split('\t'); return { sha, at: Number(t) * 1000, msg, files: files.filter(Boolean) } })
  const inWeek = c => c.at >= Date.parse(since)
  const r = reworkRate(all)
  const rework = r.rework.filter(s => inWeek(all.find(c => c.sha.startsWith(s)))), commits = all.filter(inWeek).length
  let runs = []
  try { runs = JSON.parse(execFileSync('gh', ['run', 'list', '--workflow', 'ci.yml', '--branch', 'main', '--limit', '200', '--json', 'conclusion,createdAt'], { encoding: 'utf8' })).filter(x => x.createdAt >= since) } catch {}
  const pct = x => `${(x * 100).toFixed(1)}%`
  const out = `Last ${days} days: change failure rate ${pct(changeFailureRate(runs))} (${runs.filter(x => x.conclusion === 'failure').length} failed of ${runs.length} CI runs on main); rework rate ${pct(commits ? rework.length / commits : 0)} (${rework.length} of ${commits} commits${rework.length ? `: ${rework.join(', ')}` : ''}). Target: 0 to 2% each.`
  console.log(out)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n')
}
