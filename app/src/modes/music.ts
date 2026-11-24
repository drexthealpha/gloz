// Now playing: the track on the wearer's music account, with play, pause and next track.
import type { AppEntry, Mode, ModeCtx } from './types.ts'
import type { Card } from '../core/types.ts'

// Server reply: a track, nothing playing, or what to set up.
export interface Now { track?: string; artist?: string; playing?: boolean; need?: string; error?: string; sample?: boolean }

const SAMPLE_TRACKS = [['Clair de lune', 'Claude Debussy'], ['Gymnopedie No. 1', 'Erik Satie'], ['The Swan', 'Camille Saint-Saens']]
let sampleAt = 0, samplePlaying = true
// Sample data that answers presses the way a music account would.
export function sampleMusic(body: any): Now {
  if (body?.action === 'pause') samplePlaying = false
  if (body?.action === 'play') samplePlaying = true
  if (body?.action === 'next') { sampleAt = (sampleAt + 1) % SAMPLE_TRACKS.length; samplePlaying = true }
  const [track, artist] = SAMPLE_TRACKS[sampleAt]
  return { track, artist, playing: samplePlaying, sample: true }
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
      if (loading) return { kind: 'status', text: 'Loading', hint: 'wait a moment' }
      if (now.need || now.error) return { kind: 'status', text: (now.need || now.error)!, hint: 'tap: try again' }
      if (!now.track) return { kind: 'status', text: 'Nothing playing', hint: 'tap: play' }
      return {
        kind: 'status',
        text: `${now.playing ? 'Playing' : 'Paused'}: ${now.track}${now.artist ? ` · ${now.artist}` : ''}`,
        hint: `${now.sample ? 'sample · ' : ''}tap: ${now.playing ? 'pause' : 'play'} · down: next track`,
      }
    },
    input(i) {
      if (i === 'tap') void go(now.need || now.error ? 'now' : now.playing ? 'pause' : 'play')
      if (i === 'next') void go('next')
    },
    start() { void go('now'); timer = setInterval(() => void go('now'), 20000) },
    stop() { if (timer) clearInterval(timer) },
  }
}

export const musicApp: AppEntry = { id: 'music', title: () => 'Now playing', make }
