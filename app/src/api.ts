// Talks to the Gloz backend. The app holds only the backend address and a
// pairing token; every service key stays on the backend.
import type { Draft, Msg } from './core/types.ts'

export interface Api {
  pair(code: string): Promise<string>
  inbox(after: number, lang: string, translate: boolean, wait?: number): Promise<{ msgs: Msg[]; after: number }>
  draft(id: string, lang: string, ask?: string): Promise<Draft & { ms?: number }>
  send(key: string, id: string, text: string): Promise<'ok' | 'retry' | 'drop'>
  read(id: string): Promise<void>
  stt(pcm: Uint8Array, lang: string): Promise<{ text: string; ms?: number }>
  listen(pcm: Uint8Array, lang: string, spoken: string): Promise<{ text: string; translated?: string }>
  health?(): Promise<{ ai?: boolean }>
  // An app's route on the server (POST /mode/<id>).
  mode?(id: string, body: unknown): Promise<any>
}

export class HttpApi implements Api {
  base: string
  token: string
  constructor(base: string, token: string) { this.base = base.replace(/\/+$/, ''); this.token = token }
  private async call(path: string, body?: unknown, raw = false, timeoutMs?: number): Promise<Response> {
    return fetch(this.base + path, {
      // A controller and a timer, not AbortSignal.timeout: older WebViews lack it, and a throw here read as "No signal".
      ...(timeoutMs ? { signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), timeoutMs); return c.signal })() } : {}),
      method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${this.token}`, ...(raw ? { 'content-type': 'application/octet-stream' } : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : raw ? (body as BodyInit) : JSON.stringify(body),
    })
  }
  async pair(code: string) {
    const r = await fetch(this.base + '/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })
    if (!r.ok) throw Object.assign(new Error(r.status === 403 ? 'Wrong code' : `Backend said ${r.status}`), { status: r.status })
    this.token = (await r.json()).token
    return this.token
  }
  async inbox(after: number, lang: string, translate: boolean, wait = 0) {
    const r = await this.call(`/inbox?after=${after}&lang=${lang}&translate=${translate ? 1 : 0}${wait ? `&wait=${wait}` : ''}`, undefined, false, wait ? (wait + 5) * 1000 : undefined)   // a dropped link during a wait shows as no signal within 5 s of it
    if (!r.ok) throw Object.assign(new Error(`inbox ${r.status}`), { status: r.status })
    return r.json()
  }
  async draft(id: string, lang: string, ask?: string) {
    const r = await this.call('/draft', { id, lang, ask })
    if (!r.ok) throw new Error(`draft ${r.status}`)
    return r.json()
  }
  async send(key: string, id: string, text: string) {
    try {
      const r = await this.call('/send', { key, id, text })
      if (r.ok) return 'ok'
      return r.status === 410 || r.status === 400 ? 'drop' : 'retry'
    } catch { return 'retry' }
  }
  async read(id: string) { await this.call('/read', { id }).catch(() => {}) }
  async mode(id: string, body: unknown) {
    const r = await this.call(`/mode/${encodeURIComponent(id)}`, body ?? {})
    if (!r.ok) throw Object.assign(new Error(`mode ${r.status}`), { status: r.status })
    return r.json()
  }
  async stt(pcm: Uint8Array, lang: string) {
    const r = await this.call(`/stt?lang=${lang}`, pcm, true)
    if (!r.ok) throw new Error(`stt ${r.status}`)
    return r.json()
  }
  async health() { return (await fetch(this.base + '/health')).json() }
  async listen(pcm: Uint8Array, lang: string, spoken: string) {
    const r = await this.call(`/listen?lang=${lang}&spoken=${spoken}`, pcm, true)
    if (!r.ok) throw new Error(`listen ${r.status}`)
    return r.json()
  }
}
