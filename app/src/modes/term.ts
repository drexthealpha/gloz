// Terminal: pick a command (saved or allowed on the server) or say one, then tap to run it on the
// wearer's own Gloz server. Nothing runs before that tap. The output comes back one line at a time.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

export interface Run { lines: string[]; code: number | null; cut: boolean; timedOut: boolean; ms: number; startMs: number; sample?: boolean; error?: string }

const KEY = 'term.saved'

// Sample output per sample command, so each command shows what it would print.
export function sampleOut(cmd: string): string[] {
  if (cmd === 'df') return ['disk: 21 GB used of 50 GB (44%)']
  if (cmd === 'git') return ['on branch main, nothing to commit']
  return [` ${new Date().toTimeString().slice(0, 8)} up 3 days,  2:11,  1 user,  load average: 0.08, 0.12, 0.10`]
}

export function sampleTerm(body: any): any {
  if (body?.op === 'run') return { lines: [...sampleOut(body?.cmd), 'done'], code: 0, cut: false, timedOut: false, ms: 9, startMs: 3, sample: true }
  if (body?.op === 'say') { const t = String(body.text ?? '').trim().toLowerCase().replace(/^run\s+/, ''); const name = t.split(/\s+/)[0]; return !t ? { cmd: 'df', sample: true } : ['uptime', 'df', 'git'].includes(name) ? { cmd: t, sample: true } : { error: `Not allowed: ${name}. Allowed: uptime, df, git`.slice(0, 80) } }
  return { on: true, allow: ['uptime', 'df', 'git'], sample: true }
}

function load(ctx: ModeCtx): string[] {
  try { const v = JSON.parse(ctx.store.get(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

function make(ctx: ModeCtx): Mode {
  let saved = load(ctx)
  let cmds: string[] = saved
  let state: 'loading' | 'off' | 'pick' | 'busy' | 'out' = 'loading'
  let at = 0
  let note = ''
  let out: string[] = []
  let line = 0
  let ran = ''   // the command whose output is shown
  let heardIt = false   // the command on screen is the one just heard
  let sample = false

  const merge = (allow: string[]) => { cmds = [...new Set([...saved, ...allow])]; at = Math.min(at, Math.max(0, cmds.length - 1)) }

  async function list() {
    try {
      const r = await ctx.call({ op: 'list' })
      if (!r?.on) { state = 'off'; return ctx.render() }
      merge(r.allow || []); sample = Boolean(r.sample); state = 'pick'
    } catch { state = 'pick'; note = 'No signal' }
    ctx.render()
  }

  async function heard(text: string) {
    state = 'busy'; ctx.render()
    try {
      const r = await ctx.call({ op: 'say', text, lang: ctx.lang() })
      if (r?.cmd) { cmds = [r.cmd, ...cmds.filter(c => c !== r.cmd)]; at = 0; heardIt = true } else note = r?.error || 'Nothing heard'
    } catch { note = 'No signal' }
    state = 'pick'; ctx.render()
  }

  async function run(cmd: string) {
    state = 'busy'; ctx.render()
    try {
      const r: Run = await ctx.call({ op: 'run', cmd })
      if (!r || r.error || !r.lines) { note = r?.error || 'No output'; state = 'pick'; return ctx.render() }
      if (!r.sample) { saved = [cmd, ...saved.filter(c => c !== cmd)].slice(0, 10); ctx.store.set(KEY, JSON.stringify(saved)) }
      out = r.lines; line = 0; ran = cmd; state = 'out'
    } catch { note = 'No signal'; state = 'pick' }
    ctx.render()
  }

  return {
    id: 'term',
    card(): Card {
      if (state === 'loading') return { kind: 'status', text: 'Terminal', hint: 'wait a moment' }
      if (state === 'off') return { kind: 'status', text: 'Terminal is off', hint: 'server: set GLOZ_TERMINAL=1 and GLOZ_TERMINAL_ALLOW' }
      if (state === 'busy') return { kind: 'status', text: 'Working', hint: 'wait a moment' }
      // One output line per screen, fitted to it; the hint offers only presses that move.
      if (state === 'out') return { kind: 'status', text: `${ran}: ${out[line]}`, hint: [sample && 'sample', 'tap: all commands', line < out.length - 1 && 'down: next line', line > 0 && 'up: earlier'].filter(Boolean).join(' · '), progress: [line + 1, out.length] }
      if (note) return { kind: 'status', text: note, hint: 'tap: ok · hold: say a command' }
      if (!cmds.length) return { kind: 'status', text: 'No commands allowed', hint: 'server: set GLOZ_TERMINAL_ALLOW · hold: speak' }
      return { kind: 'status', text: cmds[at], hint: `${heardIt ? (sample ? 'heard (sample) · ' : 'you said this · ') : sample ? 'sample · ' : ''}tap: run · down: next · hold: say a command`, progress: [at + 1, cmds.length] }
    },
    input(i) {
      if (state === 'loading' || state === 'off' || state === 'busy') return
      heardIt = false
      if (state === 'out') {
        if (i === 'tap') state = 'pick'
        if (i === 'next') line = Math.min(line + 1, out.length - 1)
        if (i === 'prev') line = Math.max(line - 1, 0)
        return ctx.render()
      }
      // A note (an error) is shown once; the next press clears it before doing anything.
      if (note) { note = ''; return ctx.render() }
      if (!cmds.length) return
      if (i === 'tap') return void run(cmds[at])
      if (i === 'next') at = (at + 1) % cmds.length
      if (i === 'prev') at = (at - 1 + cmds.length) % cmds.length
      ctx.render()
    },
    start: list,
    say(text) { void heard(text) },
  }
}

export const termApp: AppEntry = { id: 'term', title: () => 'Server commands', make }
