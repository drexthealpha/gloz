// Before the phone pairs, the glasses run on sample messages, so a new wearer sees what Gloz does at once:
// read a message, see the reply drafted, tap to "send" it. Every sender is marked "Sample:", and nothing
// leaves the glasses. Pairing on the phone replaces this with the wearer's own Gloz server.
import type { Api } from './api.ts'
import type { Draft, Msg } from './core/types.ts'
import { HOLDING_REPLIES } from './demo-data.ts'
import samples from './demo-inbox.json'
// @ts-ignore: plain JS shared with the server
import { handle as weather } from '../../server/modes/weather.mjs'

type Sample = Msg & { draft?: string; gloss?: string; lang: string }
const all = samples as unknown as Sample[]
// Before pairing, the tools that need the wearer's own accounts say so; the forecast is real (Open-Meteo needs no
// account), and the timer runs on the glasses alone.
const TOOLS: Record<string, (b: any) => any> = {
  weather: (b: any) => weather(b, { env: {} }),
}

export class SampleApi implements Api {
  async pair(): Promise<string> { throw new Error('pair on the phone') }
  async inbox(after: number) {
    return { msgs: after ? [] : all.map((m, i) => ({ ...m, from: `Sample: ${m.from}`, at: Date.now() - i * 60000 })), after: 1 }
  }
  async draft(id: string, _lang: string, ask?: string): Promise<Draft> {
    const m = all.find(x => x.id === id)!
    if (ask) return { text: ask, by: 'default' }
    return m.draft ? { text: m.draft, gloss: m.gloss, by: 'ai' } : { text: HOLDING_REPLIES[m.lang] ?? HOLDING_REPLIES.en, gloss: m.lang === 'en' ? undefined : HOLDING_REPLIES.en, by: 'default' }
  }
  async send() { return 'ok' as const }
  async read() {}
  async stt() { return { text: '' } }
  async listen() { return { text: '' } }
  async mode(id: string, body: unknown) { const f = TOOLS[id]; if (!f) return { error: 'Pair on your phone to use this' }; return f(body) }
}
