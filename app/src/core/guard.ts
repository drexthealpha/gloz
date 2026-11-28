// Two small rules the glasses follow, kept here so they are tested.

// A tap in the first 600 ms of a new reply card is not taken as sending it: the wearer had no time to read it.
export const GUARD_MS = 600
export const tapTooSoon = (view: string, shownAt: number, now: number) => view === 'draft' && now - shownAt < GUARD_MS

// Words being written down give up after 8 s, so the screen never waits for ever: the fallback is "nothing heard".
export const HEARING_MS = 8000
export function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let t: ReturnType<typeof setTimeout>
  return Promise.race([p, new Promise<T>(ok => { t = setTimeout(() => ok(fallback), ms) })]).finally(() => clearTimeout(t))
}
