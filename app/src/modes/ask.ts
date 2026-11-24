// Ask: hold, speak a question, release. The server writes down the question and the AI answers
// in the wearer's language. The last 10 questions and answers stay on the phone as context.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

export interface QA { q: string; a: string }
const KEY = 'ask.log'
const MAX_BYTES = 30 * 32000   // 30 s of 16 kHz 16-bit audio

export function sampleAsk(body: any): QA {
  // A question in words gets a sample line that says where a real answer comes from.
  if (typeof body?.q === 'string' && body.q.trim()) return { q: `Sample: ${body.q.trim()}`, a: 'With an AI key on the Gloz server, the answer appears here.' }
  return { q: 'Sample: How tall is Mount Everest?', a: 'Mount Everest is 8,849 metres tall, measured by China and Nepal in 2020.' }
}

function b64(parts: Uint8Array[]): string {
  let s = ''
  for (const p of parts) for (let i = 0; i < p.length; i += 0x8000) s += String.fromCharCode(...p.subarray(i, i + 0x8000))
  return btoa(s)
}

function load(ctx: ModeCtx): QA[] {
  try { const v = JSON.parse(ctx.store.get(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

function make(ctx: ModeCtx): Mode {
  let log = load(ctx)
  let at = log.length - 1          // which answer is shown; -1: ready to ask
  let state: 'ready' | 'listening' | 'thinking' | 'answer' = 'ready'
  let note = ''
  let pcm: Uint8Array[] = []
  let bytes = 0

  async function send() {
    const parts = pcm
    pcm = []; bytes = 0
    if (!parts.length) { state = 'ready'; note = 'Nothing heard'; return ctx.render() }
    return query({ pcm: b64(parts), lang: ctx.lang(), history: log })
  }
  async function query(body: object) {
    state = 'thinking'; ctx.render()
    try {
      const r: QA & { error?: string } = await ctx.call(body)
      if (!r || !r.a) { state = 'ready'; note = r?.error || 'Nothing heard'; return ctx.render() }
      log = [...log, { q: r.q || '', a: r.a }].slice(-10)
      ctx.store.set(KEY, JSON.stringify(log))
      at = log.length - 1; state = 'answer'; note = ''
    } catch { state = 'ready'; note = 'No signal' }
    ctx.render()
  }

  return {
    id: 'ask',
    card(): Card {
      if (state === 'listening') return { kind: 'status', text: 'Listening', hint: 'release: ask' }
      if (state === 'thinking') return { kind: 'status', text: 'Thinking', hint: 'wait a moment' }
      const qa = state === 'answer' ? log[at] : undefined
      if (!qa) return { kind: 'status', text: note || 'Hold and ask', hint: 'hold: speak · release: ask' }
      return { kind: 'message', head: qa.q ? `${qa.q} ·` : undefined, text: qa.a, hint: [at < log.length - 1 && 'down: next answer', at > 0 && 'up: earlier answer', 'hold: ask again'].filter(Boolean).join(' · '), progress: [at + 1, log.length] }
    },
    input(i) {
      if (i === 'hold') { pcm = []; bytes = 0; note = ''; state = 'listening'; ctx.mic(true).catch(() => {}); return ctx.render() }
      if (i === 'release') { if (state !== 'listening') return; ctx.mic(false).catch(() => {}); void send(); return }
      if (state === 'listening' || state === 'thinking') return
      if (i === 'tap') { state = 'ready'; note = '' }
      // Past the last page: the next answer; before the first page: the one before.
      if (i === 'next' && log.length) { at = Math.min(at + 1, log.length - 1); state = 'answer' }
      if (i === 'prev' && log.length) { at = state === 'answer' ? Math.max(at - 1, 0) : log.length - 1; state = 'answer' }
      ctx.render()
    },
    audio(chunk) {
      if (state !== 'listening' || bytes >= MAX_BYTES) return
      pcm.push(chunk); bytes += chunk.length
    },
    say(text) { void query({ q: text, lang: ctx.lang(), history: log }) },
    stop() { if (state === 'listening') ctx.mic(false).catch(() => {}) },
  }
}

export const askApp: AppEntry = { id: 'ask', title: () => 'Ask', make }
