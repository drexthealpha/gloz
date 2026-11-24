// Replies wait here until the backend confirms them, so a dropped phone link,
// a dead network or a closed app never loses a reply. Stored after every change.
export interface Pending { key: string; msgId: string; text: string; tries: number; nextAt: number }

export interface Store { get(k: string): string | null; set(k: string, v: string): void }

export type Sender = (p: Pending) => Promise<'ok' | 'retry' | 'drop'>

const KEY = 'gloz.outbox'

export class Outbox {
  items: Pending[]
  private store: Store
  private send: Sender
  private now: () => number
  constructor(store: Store, send: Sender, now: () => number = Date.now) {
    this.store = store
    this.send = send
    this.now = now
    try { this.items = JSON.parse(store.get(KEY) || '[]') } catch { this.items = [] }
  }

  private save() { this.store.set(KEY, JSON.stringify(this.items)) }

  // The key makes a resend after a drop safe: the backend sends each key once.
  add(msgId: string, text: string): Pending {
    const p: Pending = { key: `${msgId}#${this.now()}`, msgId, text, tries: 0, nextAt: 0 }
    this.items.push(p)
    this.save()
    return p
  }

  get size() { return this.items.length }

  // The link is back: every waiting reply is due now, not after its back-off.
  retryNow() { for (const p of this.items) p.nextAt = 0; this.save() }

  // Try every reply that is due. Returns how many were confirmed.
  confirmed: Pending[] = []   // replies the last flush confirmed

  async flush(): Promise<number> {
    let done = 0
    this.confirmed = []
    for (const p of [...this.items]) {
      if (p.nextAt > this.now()) continue
      let r: 'ok' | 'retry' | 'drop'
      try { r = await this.send(p) } catch { r = 'retry' }
      if (r === 'ok' || r === 'drop') {
        this.items = this.items.filter(x => x.key !== p.key)
        if (r === 'ok') { done++; this.confirmed.push(p) }
      } else {
        p.tries++
        // 2 s, 4 s, 8 s ... capped at 60 s, so a reply goes out soon after the link is back.
        p.nextAt = this.now() + Math.min(60000, 2000 * 2 ** (p.tries - 1))
      }
      this.save()
    }
    return done
  }
}
