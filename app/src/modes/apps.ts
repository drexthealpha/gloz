// The Apps list on the glasses: one name at a time; swipe to move, tap to open.
import type { Mode, ModeCtx, AppEntry } from './types.ts'

export function appsList(ctx: ModeCtx, apps: AppEntry[], open: (a: AppEntry) => void): Mode {
  let at = 0
  return {
    id: 'apps',
    card: () => apps.length
      ? { kind: 'status', text: apps[at].title(ctx.lang()), hint: 'tap: open · down: next · up: earlier', progress: [at + 1, apps.length] }
      : { kind: 'status', text: 'No apps yet', hint: 'double tap: back to messages' },
    input: i => {
      if (!apps.length) return
      if (i === 'next') at = (at + 1) % apps.length
      if (i === 'prev') at = (at - 1 + apps.length) % apps.length
      if (i === 'tap') return open(apps[at])
      ctx.render()
    },
  }
}
