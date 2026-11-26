// Before the phone pairs, the glasses run on sample messages, so a new wearer sees what Gloz does at once:
// read a message, see the reply drafted, tap to "send" it. Every sender is marked "Sample:", and nothing
// leaves the glasses. Pairing on the phone replaces this with the wearer's own Gloz server.
import type { Api } from './api.ts'
import type { Draft, Msg } from './core/types.ts'
import { HOLDING_REPLIES } from './demo-data.ts'
import samples from './demo-inbox.json'
import { sampleDash } from './modes/dash.ts'
import { sampleTasks } from './modes/tasks.ts'
import { sampleNotes } from './modes/notes.ts'
import { sampleAsk } from './modes/ask.ts'
import { sampleReader } from './modes/reader.ts'
import { samplePrompter } from './modes/prompter.ts'
import { sampleNav } from './modes/nav.ts'
import { sampleStocks } from './modes/stocks.ts'
import { sampleMusic } from './modes/music.ts'
import { sampleTerm } from './modes/term.ts'
// @ts-ignore: plain JS shared with the server
import { handle as weather } from '../../server/modes/weather.mjs'
// @ts-ignore: plain JS shared with the server
import { SAMPLE as news } from '../../server/modes/news.mjs'

type Sample = Msg & { draft?: string; gloss?: string; lang: string }
const all = samples as unknown as Sample[]
const TOOLS: Record<string, (b: any) => any> = {
  dash: sampleDash, tasks: sampleTasks, notes: sampleNotes, ask: sampleAsk, reader: sampleReader, nav: sampleNav,
  stocks: sampleStocks, music: sampleMusic, term: sampleTerm, news: () => news,
  prompter: (b: any) => b?.action === 'follow' ? { at: (Number(b.from) || 0) + (Number(b.at) || 0) + 4, heard: '', sample: true } : samplePrompter(b),
  // A real forecast (Open-Meteo needs no account) for where the phone is.
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
  async mode(id: string, body: unknown) { const f = TOOLS[id]; if (!f) throw new Error('no such app'); return f(body) }
}
