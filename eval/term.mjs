// Terminal: server-side command start latency, from the request reaching the handler to the
// operating system reporting the process started ('spawn'), for a harmless command: node --version.
//   node eval/term.mjs
import { handle } from '../server/modes/term.mjs'

const env = { GLOZ_TERMINAL: '1', GLOZ_TERMINAL_ALLOW: 'node' }
const start = [], whole = []
for (let i = 0; i < 55; i++) {
  const r = await handle({ op: 'run', cmd: 'node --version' }, { env })
  if (i >= 5) { start.push(r.startMs); whole.push(r.ms) }   // the first 5 warm up
}
const med = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)]
console.log({ command: 'node --version', runs: start.length, startMedianMs: med(start), finishedMedianMs: med(whole), platform: process.platform })
