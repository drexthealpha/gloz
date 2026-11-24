// Your day on the glasses, after the messages: one short item at a time, each with the tool behind it.
// Built from what the Gloz server returns for each tool; an item whose source failed is left out.
// Each item fits one line at the wearer's usual size; sample data is said in the hint, not the line.
import type { Tool } from './say.ts'
import { panelText, type DashData } from '../modes/dash.ts'
import { line, type Quotes } from '../modes/stocks.ts'
import type { Now } from '../modes/music.ts'

export interface DayItem { tool: Tool; text: string; sample?: boolean }
type Docs = { source?: string; notes?: { title?: string }[] } | null
export interface DayData {
  dash?: DashData | null
  music?: Now | null
  stocks?: Quotes | null
  notes?: Docs
  reader?: Docs
  prompter?: Docs
  term?: { on?: boolean; allow?: string[]; sample?: boolean } | null
}

export function dayItems(d: DayData, lang = 'en', now = new Date()): DayItem[] {
  const out: DayItem[] = []
  const title = (x: Docs) => (x?.notes?.[0]?.title ?? '').replace(/^Sample: /, '')
  const fromSample = (x: Docs) => x?.source === 'sample' || /^Sample: /.test(x?.notes?.[0]?.title ?? '')
  if (d.dash) {
    const s = d.dash.sample
    if (d.dash.events !== undefined) out.push({ tool: 'dash', text: `Next: ${panelText('event', d.dash, lang, now, '', true)}`, sample: s })
    if (d.dash.tasks) out.push({ tool: 'tasks', text: panelText('tasks', d.dash, lang, now, '', true), sample: s })
    if (d.dash.weather) out.push({ tool: 'dash', text: `${panelText('temp', d.dash, lang, now, '', true)} · ${panelText('range', d.dash, lang, now, '', true)}`, sample: s })
  }
  if (d.music?.track) out.push({ tool: 'music', text: `${d.music.playing ? 'Playing' : 'Paused'}: ${d.music.track}`, sample: d.music.sample })
  const q = d.stocks?.quotes?.[0]
  if (q) out.push({ tool: 'stocks', text: line(q), sample: d.stocks?.sample })
  if (title(d.notes ?? null)) out.push({ tool: 'notes', text: `Note: ${title(d.notes ?? null)}`, sample: fromSample(d.notes ?? null) })
  if (title(d.reader ?? null)) out.push({ tool: 'reader', text: `Reading: ${title(d.reader ?? null)}`, sample: fromSample(d.reader ?? null) })
  if (title(d.prompter ?? null)) out.push({ tool: 'prompter', text: `Script: ${title(d.prompter ?? null)}`, sample: fromSample(d.prompter ?? null) })
  out.push({ tool: 'nav', text: 'Directions' })
  if (d.term?.on && d.term.allow?.length) out.push({ tool: 'term', text: `Server: ${d.term.allow[0]}`, sample: d.term.sample })
  // One line: long titles are cut at a word.
  return out.map(i => ({ ...i, text: i.text.length > 30 ? i.text.slice(0, 29).replace(/\s+\S*$/, '') + '…' : i.text }))
}
