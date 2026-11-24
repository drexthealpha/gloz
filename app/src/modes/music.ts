// Now playing: the track on the wearer's music account, with play, pause and next track.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

// Server reply: a track, nothing playing, or what to set up.
export interface Now { track?: string; artist?: string; playing?: boolean; need?: string; error?: string }

export function sampleMusic(_body: unknown): Now {
  return { track: 'Clair de lune', artist: 'Claude Debussy', playing: true }
}

function make(ctx: ModeCtx): Mode {
  let now: Now = {}
  let loading = true
  let timer: ReturnType<typeof setInterval> | undefined

  async function go(action: 'now' | 'play' | 'pause' | 'next') {
    try { now = (await ctx.call({ action })) || { error: 'No signal' } } catch { now = { error: 'No signal' } }
    loading = false
    ctx.render()
  }

  return {
    id: 'music',
    card(): Card {
      if (loading) return { kind: 'status', text: 'Loading', hint: 'up: refresh' }
      if (now.need || now.error) return { kind: 'status', text: (now.need || now.error)!, hint: 'up: refresh' }
      if (!now.track) return { kind: 'status', text: 'Nothing playing', hint: 'tap: play · up: refresh' }
      return {
        kind: 'status',
        text: `${now.playing ? 'Playing' : 'Paused'}: ${now.track}${now.artist ? ` · ${now.artist}` : ''}`,
        hint: `tap: ${now.playing ? 'pause' : 'play'} · down: next track · up: refresh`,
      }
    },
    input(i) {
      if (i === 'tap') void go(now.playing ? 'pause' : 'play')
      if (i === 'next') void go('next')
      if (i === 'prev') void go('now')
    },
    start() { void go('now'); timer = setInterval(() => void go('now'), 20000) },
    stop() { if (timer) clearInterval(timer) },
  }
}

export const musicApp: AppEntry = { id: 'music', title: () => 'Now playing', make }
